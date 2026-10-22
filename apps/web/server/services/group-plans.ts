import "server-only"

import { randomUUID } from "node:crypto"

import {
  canManageMembers,
  type IsoDate,
  type Locale,
  type ParsedNewPlan,
} from "@workspace/core"
import type { Prisma, PrismaClient } from "@workspace/db"

import { roleOf, type GroupError } from "@/server/services/groups"
import {
  createPlan,
  fromDbDate,
  toDbDate,
  type PlansDb,
} from "@/server/services/plans"

export type GroupPlansDb = PlansDb & Pick<PrismaClient, "group" | "groupMember">

/** A member's reading, to show how far each one is. */
export type MemberProgress = {
  userId: string
  name: string
  completedReadings: number
}

export type GroupPlanView = {
  id: string
  title: string
  startDate: IsoDate
  endDate: IsoDate
  totalDays: number
  totalReadings: number
  /** Everyone who follows it, the furthest first. */
  members: MemberProgress[]
}

/**
 * Creates a plan for a group: the people who manage it may, and every member
 * follows it, on one common calendar. Anybody else gets "notFound" (not a
 * member) or "forbidden" (a plain member).
 */
export async function createGroupPlan(
  db: GroupPlansDb,
  userId: string,
  groupId: string,
  request: ParsedNewPlan,
  locale: Locale
): Promise<{ ok: true; id: string } | { ok: false; error: GroupError }> {
  const role = await roleOf(db, userId, groupId)
  if (!role) return { ok: false, error: "notFound" }
  if (!canManageMembers(role)) return { ok: false, error: "forbidden" }

  const members = await db.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  })
  const { id } = await createPlan(db, userId, request, locale, {
    id: groupId,
    memberIds: members.map((member) => member.userId),
  })
  return { ok: true, id }
}

/**
 * The plans of a group with how far each member is, for a member of the
 * group; null for anybody else.
 */
export async function listGroupPlans(
  db: Pick<PrismaClient, "groupMember" | "readingPlan">,
  userId: string,
  groupId: string
): Promise<GroupPlanView[] | null> {
  if (!(await roleOf(db, userId, groupId))) return null

  const plans = await db.readingPlan.findMany({
    where: { groupId },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      totalReadings: true,
      enrollments: {
        select: {
          userId: true,
          user: { select: { name: true } },
          _count: { select: { progress: true } },
        },
      },
    },
  })
  return plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    startDate: fromDbDate(plan.startDate),
    endDate: fromDbDate(plan.endDate),
    totalDays: plan.totalDays,
    totalReadings: plan.totalReadings,
    members: plan.enrollments
      .map((enrollment) => ({
        userId: enrollment.userId,
        name: enrollment.user.name,
        completedReadings: enrollment._count.progress,
      }))
      .sort(
        (a, b) =>
          b.completedReadings - a.completedReadings ||
          a.name.localeCompare(b.name)
      ),
  }))
}

/**
 * Copies a plan of a group into the personal plans of a member: the same
 * calendar and readings, on their own, with no progress and their own choice
 * of how to catch up. Only a member who follows the plan can copy it.
 */
export async function copyGroupPlan(
  db: PlansDb,
  userId: string,
  planId: string
): Promise<{ ok: true; id: string } | { ok: false; error: "notFound" }> {
  const enrollment = await db.planEnrollment.findUnique({
    where: { planId_userId: { planId, userId } },
    select: {
      plan: {
        select: {
          groupId: true,
          title: true,
          templateKey: true,
          startDate: true,
          endDate: true,
          activeWeekdays: true,
          tracks: true,
          pace: true,
          totalDays: true,
          totalVerses: true,
          totalReadings: true,
          days: {
            orderBy: { dayNumber: "asc" },
            select: {
              dayNumber: true,
              date: true,
              verses: true,
              readings: {
                orderBy: { position: "asc" },
                select: {
                  position: true,
                  track: true,
                  book: true,
                  startChapter: true,
                  startVerse: true,
                  endChapter: true,
                  endVerse: true,
                  verses: true,
                },
              },
            },
          },
        },
      },
    },
  })
  // Only the plans of a group are copied this way.
  if (!enrollment?.plan.groupId) return { ok: false, error: "notFound" }
  const { plan } = enrollment

  const newId = randomUUID()
  const days = plan.days.map((day) => ({ ...day, id: randomUUID() }))
  await db.$transaction(
    async (tx) => {
      await tx.readingPlan.create({
        data: {
          id: newId,
          ownerId: userId,
          title: plan.title,
          templateKey: plan.templateKey,
          startDate: toDbDate(fromDbDate(plan.startDate)),
          endDate: toDbDate(fromDbDate(plan.endDate)),
          activeWeekdays: plan.activeWeekdays,
          tracks: plan.tracks as Prisma.InputJsonValue,
          pace: plan.pace as Prisma.InputJsonValue,
          totalDays: plan.totalDays,
          totalVerses: plan.totalVerses,
          totalReadings: plan.totalReadings,
        },
      })
      await tx.planDay.createMany({
        data: days.map((day) => ({
          id: day.id,
          planId: newId,
          dayNumber: day.dayNumber,
          date: day.date,
          verses: day.verses,
        })),
      })
      await tx.planReading.createMany({
        data: days.flatMap((day) =>
          day.readings.map((reading) => ({ dayId: day.id, ...reading }))
        ),
      })
      await tx.planEnrollment.create({ data: { planId: newId, userId } })
    },
    { timeout: 20_000 }
  )
  return { ok: true, id: newId }
}
