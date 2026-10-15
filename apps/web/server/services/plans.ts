import "server-only"

import { randomUUID } from "node:crypto"

import { z } from "zod"

import {
  generatePlan,
  isBookId,
  locales,
  resolveNewPlan,
  type IsoDate,
  type Locale,
  type ParsedNewPlan,
  type Passage,
  type Weekday,
} from "@workspace/core"
import type { PlanEnrollmentStatus, Prisma, PrismaClient } from "@workspace/db"

export type PlansDb = Pick<
  PrismaClient,
  | "$transaction"
  | "readingPlan"
  | "planDay"
  | "planReading"
  | "planEnrollment"
  | "readingProgress"
>

/** A calendar date stored in a DATE column (midnight UTC). */
export function toDbDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

export function fromDbDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

/** A one-year plan has about 400 to 1,500 readings: allow a slow network. */
const CREATE_TIMEOUT_MS = 20_000

/**
 * Generates a plan and stores it, with its days and readings, in a single
 * transaction (4 queries whatever its length), then enrolls its owner.
 * Throws a PlanGenerationError when the request cannot produce a plan.
 */
export async function createPlan(
  db: PlansDb,
  userId: string,
  request: ParsedNewPlan,
  locale: Locale
): Promise<{ id: string }> {
  const { title, templateKey, tracks, input } = resolveNewPlan(request, locale)
  const generated = generatePlan(input)
  const planId = randomUUID()

  const days = generated.days.map((day) => ({ ...day, id: randomUUID() }))
  const dayRows = days.map((day) => ({
    id: day.id,
    planId,
    dayNumber: day.day,
    date: toDbDate(day.date),
    verses: day.verses,
  }))
  const readingRows = days.flatMap((day) =>
    day.readings.map(({ track, passage, verses }, position) => ({
      dayId: day.id,
      position,
      track,
      book: passage.book,
      startChapter: passage.start.chapter,
      startVerse: passage.start.verse,
      endChapter: passage.end.chapter,
      endVerse: passage.end.verse,
      verses,
    }))
  )

  await db.$transaction(
    async (tx) => {
      await tx.readingPlan.create({
        data: {
          id: planId,
          ownerId: userId,
          title,
          templateKey,
          startDate: toDbDate(generated.startDate),
          endDate: toDbDate(generated.endDate),
          activeWeekdays: input.activeWeekdays ?? [0, 1, 2, 3, 4, 5, 6],
          tracks,
          pace: input.pace,
          totalDays: generated.days.length,
          totalVerses: generated.totalVerses,
          totalReadings: readingRows.length,
        },
      })
      await tx.planDay.createMany({ data: dayRows })
      await tx.planReading.createMany({ data: readingRows })
      await tx.planEnrollment.create({ data: { planId, userId } })
    },
    { timeout: CREATE_TIMEOUT_MS }
  )
  return { id: planId }
}

export type PlanSummary = {
  id: string
  title: string
  templateKey: string | null
  startDate: IsoDate
  endDate: IsoDate
  totalDays: number
  status: PlanEnrollmentStatus
  completedReadings: number
  totalReadings: number
}

/**
 * Plans the user follows, most recent first. Archived plans are left out
 * unless asked for.
 */
export async function listPlans(
  db: PlansDb,
  userId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<PlanSummary[]> {
  const enrollments = await db.planEnrollment.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { status: { not: "ARCHIVED" } }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      _count: { select: { progress: true } },
      plan: {
        select: {
          id: true,
          title: true,
          templateKey: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          totalReadings: true,
        },
      },
    },
  })
  return enrollments.map(({ status, _count, plan }) => ({
    id: plan.id,
    title: plan.title,
    templateKey: plan.templateKey,
    startDate: fromDbDate(plan.startDate),
    endDate: fromDbDate(plan.endDate),
    totalDays: plan.totalDays,
    status,
    completedReadings: _count.progress,
    totalReadings: plan.totalReadings,
  }))
}

export type PlanDetailReading = {
  id: string
  track: number
  passage: Passage
  verses: number
  /** When the user marked it as read, or null. */
  completedAt: Date | null
}

export type PlanDetailDay = {
  id: string
  day: number
  date: IsoDate
  verses: number
  readings: PlanDetailReading[]
}

export type PlanDetail = PlanSummary & {
  enrollmentId: string
  activeWeekdays: Weekday[]
  totalVerses: number
  /** Names of the tracks (null when unnamed), for plans with several. */
  trackNames: (Record<Locale, string> | null)[]
  days: PlanDetailDay[]
}

const localizedSchema = z.object(
  Object.fromEntries(locales.map((locale) => [locale, z.string()])) as Record<
    Locale,
    z.ZodString
  >
)
const storedTracksSchema = z.array(
  z.object({ name: localizedSchema.optional() })
)

/** Track names stored with a plan (ReadingPlan.tracks). */
function parseTrackNames(tracks: unknown): (Record<Locale, string> | null)[] {
  const parsed = storedTracksSchema.safeParse(tracks)
  return parsed.success ? parsed.data.map((track) => track.name ?? null) : []
}

/** A day with its readings and the progress of one user. */
function daySelect(userId: string) {
  return {
    id: true,
    dayNumber: true,
    date: true,
    verses: true,
    readings: {
      orderBy: { position: "asc" },
      select: {
        id: true,
        track: true,
        book: true,
        startChapter: true,
        startVerse: true,
        endChapter: true,
        endVerse: true,
        verses: true,
        progress: {
          where: { enrollment: { userId } },
          select: { completedAt: true },
        },
      },
    },
  } satisfies Prisma.PlanDaySelect
}

type DayRow = Prisma.PlanDayGetPayload<{
  select: ReturnType<typeof daySelect>
}>

function toDetailDay(day: DayRow): PlanDetailDay {
  return {
    id: day.id,
    day: day.dayNumber,
    date: fromDbDate(day.date),
    verses: day.verses,
    // Books are written by createPlan from the canon: a stored code is valid.
    readings: day.readings
      .filter((reading) => isBookId(reading.book))
      .map((reading) => ({
        id: reading.id,
        track: reading.track,
        passage: {
          book: reading.book as Passage["book"],
          start: { chapter: reading.startChapter, verse: reading.startVerse },
          end: { chapter: reading.endChapter, verse: reading.endVerse },
        },
        verses: reading.verses,
        completedAt: reading.progress[0]?.completedAt ?? null,
      })),
  }
}

/**
 * A plan with all its days and the progress of the user, or null when the
 * plan does not exist or the user does not follow it.
 */
export async function getPlan(
  db: PlansDb,
  userId: string,
  planId: string
): Promise<PlanDetail | null> {
  const enrollment = await db.planEnrollment.findUnique({
    where: { planId_userId: { planId, userId } },
    select: {
      id: true,
      status: true,
      plan: {
        select: {
          id: true,
          title: true,
          templateKey: true,
          startDate: true,
          endDate: true,
          activeWeekdays: true,
          tracks: true,
          totalDays: true,
          totalVerses: true,
          totalReadings: true,
          days: {
            orderBy: { dayNumber: "asc" },
            select: daySelect(userId),
          },
        },
      },
    },
  })
  if (!enrollment) return null

  const { plan } = enrollment
  const days = plan.days.map(toDetailDay)

  return {
    id: plan.id,
    enrollmentId: enrollment.id,
    title: plan.title,
    templateKey: plan.templateKey,
    startDate: fromDbDate(plan.startDate),
    endDate: fromDbDate(plan.endDate),
    activeWeekdays: plan.activeWeekdays as Weekday[],
    totalDays: plan.totalDays,
    totalVerses: plan.totalVerses,
    totalReadings: plan.totalReadings,
    status: enrollment.status,
    trackNames: parseTrackNames(plan.tracks),
    completedReadings: days.reduce(
      (total, day) =>
        total + day.readings.filter((reading) => reading.completedAt).length,
      0
    ),
    days,
  }
}

/**
 * Marks a reading as read (or not read) for the user. Idempotent: marking
 * twice keeps one record, even when two requests arrive together. Returns
 * false when the reading does not exist or the user does not follow its
 * plan.
 */
export async function setReadingProgress(
  db: PlansDb,
  userId: string,
  readingId: string,
  read: boolean
): Promise<boolean> {
  const reading = await db.planReading.findUnique({
    where: { id: readingId },
    select: {
      day: {
        select: {
          plan: {
            select: {
              enrollments: { where: { userId }, select: { id: true } },
            },
          },
        },
      },
    },
  })
  const enrollmentId = reading?.day.plan.enrollments[0]?.id
  if (!enrollmentId) return false

  if (read) {
    await db.readingProgress.createMany({
      data: [{ enrollmentId, readingId }],
      skipDuplicates: true,
    })
  } else {
    await db.readingProgress.deleteMany({ where: { enrollmentId, readingId } })
  }
  return true
}

export type TodayPlan = {
  id: string
  title: string
  trackNames: (Record<Locale, string> | null)[]
  completedReadings: number
  totalReadings: number
  /** The reading day of today, or else the next one; null once the plan is over. */
  day: PlanDetailDay | null
  /** Whether `day` is today. */
  isToday: boolean
}

/**
 * Active plans of the user with their readings for `today` (a date in the
 * user's time zone), or their next reading day when today has none.
 */
export async function getTodayPlans(
  db: PlansDb,
  userId: string,
  today: IsoDate
): Promise<TodayPlan[]> {
  const enrollments = await db.planEnrollment.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      _count: { select: { progress: true } },
      plan: {
        select: {
          id: true,
          title: true,
          tracks: true,
          totalReadings: true,
          days: {
            where: { date: { gte: toDbDate(today) } },
            orderBy: { date: "asc" },
            take: 1,
            select: daySelect(userId),
          },
        },
      },
    },
  })
  return enrollments.map(({ _count, plan }) => {
    const day = plan.days[0] ? toDetailDay(plan.days[0]) : null
    return {
      id: plan.id,
      title: plan.title,
      trackNames: parseTrackNames(plan.tracks),
      completedReadings: _count.progress,
      totalReadings: plan.totalReadings,
      day,
      isToday: day?.date === today,
    }
  })
}
