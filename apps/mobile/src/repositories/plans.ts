import {
  allWeekdays,
  generatePlan,
  newPlanSchema,
  resolveNewPlan,
  type IsoDate,
  type Locale,
  type NewPlan,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import { desc, eq, ne } from "drizzle-orm"

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
