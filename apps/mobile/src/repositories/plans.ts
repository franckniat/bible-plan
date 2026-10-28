import {
  allWeekdays,
  generatePlan,
  isBookId,
  newPlanSchema,
  resolveNewPlan,
  type BookId,
  type IsoDate,
  type Locale,
  type NewPlan,
  type Passage,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import {
  planDays,
  planEnrollments,
  planReadings,
  readingPlans,
} from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced } from "./write"

/** Rows inserted at once, under SQLite's limit of bound values. */
const CHUNK = 80

function chunks<T>(rows: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(rows.length / CHUNK) }, (_, index) =>
    rows.slice(index * CHUNK, (index + 1) * CHUNK)
  )
}

/**
 * Generates a plan on the phone with the web's generator (@workspace/core),
 * stores it with its days and readings, and follows it: both records go
 * into the outbox in one transaction. Throws a PlanGenerationError when the
 * request cannot produce a plan, a ZodError when it is invalid.
 */
export function createPlan(
  db: Database,
  request: NewPlan,
  locale: Locale,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): { id: string } {
  const parsed = newPlanSchema.parse(request)
  const { title, templateKey, tracks, input } = resolveNewPlan(parsed, locale)
  const generated = generatePlan(input)
  const updatedAt = now.toISOString()

  const days = generated.days.map((day) => ({
    id: id(),
    dayNumber: day.day,
    date: day.date,
    verses: day.verses,
    readings: day.readings.map(({ track, passage, verses }, position) => ({
      id: id(),
      position,
      track,
      book: passage.book,
      startChapter: passage.start.chapter,
      startVerse: passage.start.verse,
      endChapter: passage.end.chapter,
      endVerse: passage.end.verse,
      verses,
    })),
  }))
  const plan: SyncRecord<"readingPlan"> = {
    id: id(),
    title,
    templateKey,
    startDate: generated.startDate,
    endDate: generated.endDate,
    activeWeekdays: input.activeWeekdays ?? [...allWeekdays],
    tracks,
    pace: input.pace,
    totalDays: days.length,
    totalVerses: generated.totalVerses,
    totalReadings: days.reduce((total, day) => total + day.readings.length, 0),
    catchUpStrategy: "SHIFT",
    groupId: null,
    updatedAt,
    days,
  }
  const enrollment: SyncRecord<"planEnrollment"> = {
    id: id(),
    planId: plan.id,
    status: "ACTIVE",
    updatedAt,
  }

  writeSynced(
    db,
    [
      { table: "readingPlan", op: "upsert", record: plan },
      { table: "planEnrollment", op: "upsert", record: enrollment },
    ],
    (tx) => {
      // Drizzle keeps the columns of the table: the nested days are left out.
      tx.insert(readingPlans).values(plan).run()
      for (const rows of chunks(days)) {
        tx.insert(planDays)
          .values(rows.map((day) => ({ ...day, planId: plan.id })))
          .run()
      }
      const readings = days.flatMap((day) =>
        day.readings.map((reading) => ({ ...reading, dayId: day.id }))
      )
      for (const rows of chunks(readings)) {
        tx.insert(planReadings).values(rows).run()
      }
      tx.insert(planEnrollments).values(enrollment).run()
    },
    now
  )
  return { id: plan.id }
}

export type PlanSummary = {
  id: string
  title: string
  templateKey: string | null
  startDate: IsoDate
  endDate: IsoDate
  totalDays: number
  totalReadings: number
  status: "ACTIVE" | "PAUSED" | "ARCHIVED"
}

/** Plans followed on this phone, most recent first, without archived ones. */
export function listPlans(db: Database): PlanSummary[] {
  return db
    .select({
      id: readingPlans.id,
      title: readingPlans.title,
      templateKey: readingPlans.templateKey,
      startDate: readingPlans.startDate,
      endDate: readingPlans.endDate,
      totalDays: readingPlans.totalDays,
      totalReadings: readingPlans.totalReadings,
      status: planEnrollments.status,
    })
    .from(planEnrollments)
    .innerJoin(readingPlans, eq(readingPlans.id, planEnrollments.planId))
    .where(ne(planEnrollments.status, "ARCHIVED"))
    .orderBy(desc(planEnrollments.id))
    .all()
}

/** The plans followed, kept up to date. */
export function usePlans(): PlanSummary[] {
  return useLocalQuery(["readingPlan", "planEnrollment"], () =>
    listPlans(getDatabase())
  )
}

/** Creates a plan (for screens). */
export function addPlan(request: NewPlan, locale: Locale): { id: string } {
  return createPlan(getDatabase(), request, locale)
}

export type PlanReadingView = {
  id: string
  track: number
  passage: Passage
  verses: number
}

export type PlanDayView = {
  id: string
  day: number
  date: IsoDate
  verses: number
  readings: PlanReadingView[]
}

/** Names of a plan's tracks (null when unnamed), as stored with it. */
function trackNamesOf(tracks: unknown): (Record<Locale, string> | null)[] {
  return Array.isArray(tracks)
    ? tracks.map((track: { name?: Record<Locale, string> }) =>
        track && typeof track === "object" && track.name ? track.name : null
      )
    : []
}

/** Days of a plan with their readings, in order (all, or from `from` on). */
export function planDaysOf(
  db: Database,
  planId: string,
  { from, limit }: { from?: IsoDate; limit?: number } = {}
): PlanDayView[] {
  const where = and(
    eq(planDays.planId, planId),
    from ? gte(planDays.date, from) : undefined
  )
  const days = db
    .select()
    .from(planDays)
    .where(where)
    .orderBy(asc(planDays.dayNumber))
    .limit(limit ?? -1)
    .all()
  const last = days.at(-1)
  if (!last) return []
  // Joined rather than listed by id: a long plan has thousands of days.
  const readings = db
    .select({ reading: planReadings })
    .from(planReadings)
    .innerJoin(planDays, eq(planDays.id, planReadings.dayId))
    .where(and(where, lte(planDays.dayNumber, last.dayNumber)))
    .orderBy(asc(planReadings.position))
    .all()
    .map((row) => row.reading)
  const byDay = new Map<string, typeof readings>()
  for (const reading of readings) {
    byDay.set(reading.dayId, [...(byDay.get(reading.dayId) ?? []), reading])
  }
  return days.map((day) => ({
    id: day.id,
    day: day.dayNumber,
    date: day.date,
    verses: day.verses,
    // Books are written by createPlan from the canon: a stored code is valid.
    readings: (byDay.get(day.id) ?? [])
      .filter((reading) => isBookId(reading.book))
      .map((reading) => ({
        id: reading.id,
        track: reading.track,
        passage: {
          book: reading.book as BookId,
          start: { chapter: reading.startChapter, verse: reading.startVerse },
          end: { chapter: reading.endChapter, verse: reading.endVerse },
        },
        verses: reading.verses,
      })),
  }))
}

export type TodayPlan = {
  id: string
  title: string
  trackNames: (Record<Locale, string> | null)[]
  totalReadings: number
  /** The reading day of today, or else the next one; null once the plan is over. */
  day: PlanDayView | null
  /** Whether `day` is today. */
  isToday: boolean
}

/**
 * Active plans with their readings for `today` (a date in the person's time
 * zone), or their next reading day when today has none, as on the web.
 */
export function todayPlans(db: Database, today: IsoDate): TodayPlan[] {
  return db
    .select({
      id: readingPlans.id,
      title: readingPlans.title,
      tracks: readingPlans.tracks,
      totalReadings: readingPlans.totalReadings,
    })
    .from(planEnrollments)
    .innerJoin(readingPlans, eq(readingPlans.id, planEnrollments.planId))
    .where(eq(planEnrollments.status, "ACTIVE"))
    .orderBy(asc(planEnrollments.id))
    .all()
    .map((plan) => {
      const [day] = planDaysOf(db, plan.id, { from: today, limit: 1 })
      return {
        id: plan.id,
        title: plan.title,
        trackNames: trackNamesOf(plan.tracks),
        totalReadings: plan.totalReadings,
        day: day ?? null,
        isToday: day?.date === today,
      }
    })
}

/** Today's readings of the active plans, kept up to date. */
export function useTodayPlans(today: IsoDate): TodayPlan[] {
  return useLocalQuery(
    ["readingPlan", "planEnrollment"],
    () => todayPlans(getDatabase(), today),
    [today]
  )
}
