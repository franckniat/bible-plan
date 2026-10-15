import "server-only"

import { randomUUID } from "node:crypto"

import { z } from "zod"

import {
  generatePlan,
  planCatchUp,
  PlanGenerationError,
  isBookId,
  locales,
  resolveNewPlan,
  type CatchUpChanges,
  type CatchUpStrategy,
  type IsoDate,
  type Locale,
  type ParsedNewPlan,
  type Passage,
  type PlanGenerationErrorCode,
  type ScheduleDay,
  type Weekday,
} from "@workspace/core"
import {
  Prisma,
  type PlanEnrollmentStatus,
  type PrismaClient,
} from "@workspace/db"

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
  /** Whether the user created the plan (and may change its settings). */
  isOwner: boolean
  catchUpStrategy: CatchUpStrategy
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
          ownerId: true,
          catchUpStrategy: true,
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
    isOwner: plan.ownerId === userId,
    catchUpStrategy: plan.catchUpStrategy,
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

/**
 * Pauses, resumes or archives a plan for the user (their enrollment only).
 * Returns false when the user does not follow the plan.
 */
export async function setPlanStatus(
  db: PlansDb,
  userId: string,
  planId: string,
  status: PlanEnrollmentStatus
): Promise<boolean> {
  const { count } = await db.planEnrollment.updateMany({
    where: { planId, userId },
    data: { status },
  })
  return count > 0
}

/**
 * Deletes a plan owned by the user, with its days and everyone's progress.
 * Someone who only follows the plan leaves it instead. Returns false when
 * the user neither owns nor follows the plan.
 */
export async function deletePlan(
  db: PlansDb,
  userId: string,
  planId: string
): Promise<boolean> {
  const deleted = await db.readingPlan.deleteMany({
    where: { id: planId, ownerId: userId },
  })
  if (deleted.count > 0) return true
  const left = await db.planEnrollment.deleteMany({
    where: { planId, userId },
  })
  return left.count > 0
}

export type CatchUpError =
  | "not_found"
  /** Plans followed by several people only allow FREE. */
  | "shared_plan"
  | PlanGenerationErrorCode

/**
 * Brings a late plan back on schedule with a strategy (see planCatchUp),
 * for the day `today` of the user. Readings already read are never deleted
 * nor moved to another day. Returns whether anything changed.
 */
export async function applyCatchUp(
  db: PlansDb,
  userId: string,
  planId: string,
  strategy: CatchUpStrategy,
  today: IsoDate
): Promise<
  { ok: true; changed: boolean } | { ok: false; error: CatchUpError }
> {
  const plan = await getPlan(db, userId, planId)
  if (!plan) return { ok: false, error: "not_found" }
  if (strategy !== "FREE") {
    const followers = await db.planEnrollment.count({ where: { planId } })
    if (followers > 1) return { ok: false, error: "shared_plan" }
  }

  const days: ScheduleDay[] = plan.days.map((day) => ({
    id: day.id,
    date: day.date,
    readings: day.readings.map((reading) => ({
      id: reading.id,
      track: reading.track,
      passage: reading.passage,
      verses: reading.verses,
      done: reading.completedAt !== null,
    })),
  }))
  let changes: CatchUpChanges | null
  try {
    changes = planCatchUp(strategy, {
      days,
      today,
      activeWeekdays: plan.activeWeekdays,
      endDate: plan.endDate,
    })
  } catch (error) {
    if (error instanceof PlanGenerationError) {
      return { ok: false, error: error.code }
    }
    throw error
  }
  if (!changes) return { ok: true, changed: false }
  const { moveDays, removeReadings, addDays } = changes

  // Existing day of each date once the days are moved: new readings join it.
  const moved = new Map(moveDays.map((move) => [move.dayId, move.date]))
  const dayOfDate = new Map<IsoDate, string>()
  for (const day of days) {
    const date = moved.get(day.id) ?? day.date
    if (!dayOfDate.has(date)) dayOfDate.set(date, day.id)
  }
  const newDays = addDays
    .filter((day) => !dayOfDate.has(day.date))
    .map((day) => ({ id: randomUUID(), date: day.date }))
  for (const day of newDays) dayOfDate.set(day.date, day.id)

  await db.$transaction(
    async (tx) => {
      // Unread readings to replace; a reading with any progress stays.
      if (removeReadings.length > 0) {
        await tx.planReading.deleteMany({
          where: {
            id: { in: removeReadings },
            day: { planId },
            progress: { none: {} },
          },
        })
      }
      if (moveDays.length > 0) {
        const values = Prisma.join(
          moveDays.map(
            (move) => Prisma.sql`(${move.dayId}, ${move.date}::date)`
          )
        )
        await tx.$executeRaw`
          UPDATE "PlanDay" AS d SET "date" = v.date
          FROM (VALUES ${values}) AS v(id, date)
          WHERE d.id = v.id AND d."planId" = ${planId}`
      }
      if (newDays.length > 0) {
        // Temporary numbers above any existing one; renumbered below.
        await tx.planDay.createMany({
          data: newDays.map((day, index) => ({
            id: day.id,
            planId,
            dayNumber: 1_000_000 + index,
            date: toDbDate(day.date),
            verses: 0,
          })),
        })
      }
      if (addDays.length > 0) {
        const dayIds = addDays.map((day) => dayOfDate.get(day.date)!)
        const last = await tx.planReading.groupBy({
          by: ["dayId"],
          where: { dayId: { in: dayIds } },
          _max: { position: true },
        })
        const nextPosition = new Map(
          last.map((row) => [row.dayId, (row._max.position ?? -1) + 1])
        )
        await tx.planReading.createMany({
          data: addDays.flatMap((day) => {
            const dayId = dayOfDate.get(day.date)!
            const start = nextPosition.get(dayId) ?? 0
            return day.readings.map(({ track, passage, verses }, index) => ({
              dayId,
              position: start + index,
              track,
              book: passage.book,
              startChapter: passage.start.chapter,
              startVerse: passage.start.verse,
              endChapter: passage.end.chapter,
              endVerse: passage.end.verse,
              verses,
            }))
          }),
        })
      }

      // Days left without readings go; the others are counted again and
      // numbered in date order (negative first: numbers must stay unique).
      await tx.$executeRaw`
        DELETE FROM "PlanDay" AS d WHERE d."planId" = ${planId}
        AND NOT EXISTS (SELECT 1 FROM "PlanReading" r WHERE r."dayId" = d.id)`
      await tx.$executeRaw`
        UPDATE "PlanDay" AS d SET
          "dayNumber" = -n.rank,
          "verses" = (SELECT COALESCE(SUM(r.verses), 0) FROM "PlanReading" r WHERE r."dayId" = d.id)
        FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "date", "dayNumber") AS rank
          FROM "PlanDay" WHERE "planId" = ${planId}
        ) AS n
        WHERE d.id = n.id`
      await tx.$executeRaw`
        UPDATE "PlanDay" SET "dayNumber" = -"dayNumber"
        WHERE "planId" = ${planId}`
      await tx.$executeRaw`
        UPDATE "ReadingPlan" SET
          "endDate" = (SELECT MAX("date") FROM "PlanDay" WHERE "planId" = ${planId}),
          "totalDays" = (SELECT COUNT(*) FROM "PlanDay" WHERE "planId" = ${planId}),
          "totalReadings" = (
            SELECT COUNT(*) FROM "PlanReading" r
            JOIN "PlanDay" d ON d.id = r."dayId" WHERE d."planId" = ${planId}
          ),
          "updatedAt" = NOW()
        WHERE id = ${planId}`
    },
    { timeout: CREATE_TIMEOUT_MS }
  )
  return { ok: true, changed: true }
}

/**
 * Chooses what happens when the plan is late. Only its owner can change it;
 * returns false otherwise.
 */
export async function setCatchUpStrategy(
  db: PlansDb,
  userId: string,
  planId: string,
  strategy: CatchUpStrategy
): Promise<boolean> {
  const { count } = await db.readingPlan.updateMany({
    where: { id: planId, ownerId: userId },
    data: { catchUpStrategy: strategy },
  })
  return count > 0
}
