import {
  allWeekdays,
  generatePlan,
  isBookId,
  planCatchUp,
  PlanGenerationError,
  rebuildSchedule,
  newPlanSchema,
  resolveNewPlan,
  type BookId,
  type CatchUpChanges,
  type CatchUpStrategy,
  type IsoDate,
  type Locale,
  type NewPlan,
  type Passage,
  type PlanGenerationErrorCode,
  type ScheduleDay,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  sql,
} from "drizzle-orm"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import {
  planDays,
  planEnrollments,
  planReadings,
  readingPlans,
  readingProgress,
} from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced } from "./write"

/** The synced tables the plans' screens read. */
const planTables = ["readingPlan", "planEnrollment", "readingProgress"]

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
  completedReadings: number
}

/** Plans followed on this phone, most recent first, without archived ones. */
export function listPlans(
  db: Database,
  { archived = false }: { archived?: boolean } = {}
): PlanSummary[] {
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
    .where(
      archived
        ? eq(planEnrollments.status, "ARCHIVED")
        : ne(planEnrollments.status, "ARCHIVED")
    )
    .orderBy(desc(planEnrollments.id))
    .all()
    .map((plan) => ({
      ...plan,
      completedReadings: completedReadings(db, plan.id),
    }))
}

/** The plans followed, kept up to date. */
export function usePlans(archived = false): PlanSummary[] {
  return useLocalQuery(
    planTables,
    () => listPlans(getDatabase(), { archived }),
    [archived]
  )
}

export type PlanStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"

/**
 * Pauses, resumes, archives or restores the plan followed (its enrollment),
 * as on the web: a paused or archived plan leaves Today, an archived one
 * stays in the archived plans with its progress.
 */
export function setPlanStatus(
  db: Database,
  planId: string,
  status: PlanStatus,
  { now = new Date() }: { now?: Date } = {}
): boolean {
  const [enrollment] = db
    .select()
    .from(planEnrollments)
    .where(eq(planEnrollments.planId, planId))
    .all()
  if (!enrollment) return false
  if (enrollment.status === status) return true
  const record: SyncRecord<"planEnrollment"> = {
    ...enrollment,
    status,
    updatedAt: now.toISOString(),
  }
  writeSynced(
    db,
    { table: "planEnrollment", op: "upsert", record },
    (tx) =>
      tx
        .update(planEnrollments)
        .set({ status, updatedAt: record.updatedAt })
        .where(eq(planEnrollments.id, enrollment.id))
        .run(),
    now
  )
  return true
}

/**
 * Deletes a plan with its days, readings, enrollment and progress, written
 * to the outbox as deletes (the sync removes them everywhere).
 */
export function deletePlan(
  db: Database,
  planId: string,
  { now = new Date() }: { now?: Date } = {}
): boolean {
  const enrollments = db
    .select({ id: planEnrollments.id })
    .from(planEnrollments)
    .where(eq(planEnrollments.planId, planId))
    .all()
  const [plan] = db
    .select({ id: readingPlans.id })
    .from(readingPlans)
    .where(eq(readingPlans.id, planId))
    .all()
  if (!plan) return false
  const progress = enrollments.flatMap((enrollment) =>
    db
      .select({ id: readingProgress.id })
      .from(readingProgress)
      .where(eq(readingProgress.enrollmentId, enrollment.id))
      .all()
  )
  const dayIds = db
    .select({ id: planDays.id })
    .from(planDays)
    .where(eq(planDays.planId, planId))
    .all()
    .map((day) => day.id)
  writeSynced(
    db,
    [
      ...progress.map((row) => ({
        table: "readingProgress" as const,
        op: "delete" as const,
        id: row.id,
      })),
      ...enrollments.map((row) => ({
        table: "planEnrollment" as const,
        op: "delete" as const,
        id: row.id,
      })),
      { table: "readingPlan", op: "delete", id: planId },
    ],
    (tx) => {
      for (const ids of chunks(progress.map((row) => row.id))) {
        tx.delete(readingProgress).where(inArray(readingProgress.id, ids)).run()
      }
      tx.delete(planEnrollments).where(eq(planEnrollments.planId, planId)).run()
      for (const ids of chunks(dayIds)) {
        tx.delete(planReadings).where(inArray(planReadings.dayId, ids)).run()
      }
      tx.delete(planDays).where(eq(planDays.planId, planId)).run()
      tx.delete(readingPlans).where(eq(readingPlans.id, planId)).run()
    },
    now
  )
  return true
}

/** Deletes a plan (for screens). */
export function removePlan(planId: string) {
  return deletePlan(getDatabase(), planId)
}

/** Changes a plan's status (for screens). */
export function changePlanStatus(planId: string, status: PlanStatus) {
  return setPlanStatus(getDatabase(), planId, status)
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
  /** When it was marked as read, or null. */
  completedAt: string | null
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
    .select({
      reading: planReadings,
      completedAt: readingProgress.completedAt,
    })
    .from(planReadings)
    .innerJoin(planDays, eq(planDays.id, planReadings.dayId))
    .leftJoin(readingProgress, eq(readingProgress.readingId, planReadings.id))
    .where(and(where, lte(planDays.dayNumber, last.dayNumber)))
    .orderBy(asc(planReadings.position))
    .all()
    .map((row) => ({ ...row.reading, completedAt: row.completedAt }))
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
        completedAt: reading.completedAt,
      })),
  }))
}

export type TodayPlan = {
  id: string
  title: string
  trackNames: (Record<Locale, string> | null)[]
  totalReadings: number
  completedReadings: number
  /** Unread readings planned before today. */
  lateReadings: number
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
        completedReadings: completedReadings(db, plan.id),
        lateReadings: lateReadings(db, plan.id, today),
        day: day ?? null,
        isToday: day?.date === today,
      }
    })
}

/** Today's readings of the active plans, kept up to date. */
export function useTodayPlans(today: IsoDate): TodayPlan[] {
  return useLocalQuery(planTables, () => todayPlans(getDatabase(), today), [
    today,
  ])
}

/** Readings of a plan marked as read. */
function completedReadings(db: Database, planId: string): number {
  const [row] = db
    .select({ count: count() })
    .from(readingProgress)
    .innerJoin(
      planEnrollments,
      eq(planEnrollments.id, readingProgress.enrollmentId)
    )
    .where(eq(planEnrollments.planId, planId))
    .all()
  return row?.count ?? 0
}

/** Readings of a plan planned before `today` and not read yet. */
function lateReadings(db: Database, planId: string, today: IsoDate): number {
  const [row] = db
    .select({ count: count() })
    .from(planReadings)
    .innerJoin(planDays, eq(planDays.id, planReadings.dayId))
    .leftJoin(readingProgress, eq(readingProgress.readingId, planReadings.id))
    .where(
      and(
        eq(planDays.planId, planId),
        lt(planDays.date, today),
        isNull(readingProgress.id)
      )
    )
    .all()
  return row?.count ?? 0
}

/**
 * Marks a reading as read, or not read, in the plan followed: one progress
 * record per reading (marking twice keeps one), written to the outbox. Does
 * nothing for a reading of no plan followed. Works offline.
 */
export function setReadingRead(
  db: Database,
  readingId: string,
  read: boolean,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): void {
  const [enrollment] = db
    .select({ id: planEnrollments.id })
    .from(planReadings)
    .innerJoin(planDays, eq(planDays.id, planReadings.dayId))
    .innerJoin(planEnrollments, eq(planEnrollments.planId, planDays.planId))
    .where(eq(planReadings.id, readingId))
    .all()
  if (!enrollment) return
  const [current] = db
    .select()
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.enrollmentId, enrollment.id),
        eq(readingProgress.readingId, readingId)
      )
    )
    .all()
  if (read) {
    if (current) return
    const record: SyncRecord<"readingProgress"> = {
      id: id(),
      enrollmentId: enrollment.id,
      readingId,
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    writeSynced(
      db,
      { table: "readingProgress", op: "upsert", record },
      (tx) => tx.insert(readingProgress).values(record).run(),
      now
    )
  } else if (current) {
    writeSynced(
      db,
      { table: "readingProgress", op: "delete", id: current.id },
      (tx) =>
        tx
          .delete(readingProgress)
          .where(eq(readingProgress.id, current.id))
          .run(),
      now
    )
  }
}

/** Marks a reading as read or not (for screens). */
export function markReading(readingId: string, read: boolean): void {
  setReadingRead(getDatabase(), readingId, read)
}

/** Whether a reading is marked as read, kept up to date. */
export function useReadingDone(readingId: string | undefined): boolean {
  return useLocalQuery(
    planTables,
    () =>
      readingId
        ? getDatabase()
            .select({ id: readingProgress.id })
            .from(readingProgress)
            .where(eq(readingProgress.readingId, readingId))
            .all().length > 0
        : false,
    [readingId]
  )
}

export type PlanDetail = {
  id: string
  title: string
  status: PlanStatus
  startDate: IsoDate
  endDate: IsoDate
  totalReadings: number
  completedReadings: number
  trackNames: (Record<Locale, string> | null)[]
  days: PlanDayView[]
}

/** A plan with all its days, readings and progress; null when unknown. */
export function planDetail(db: Database, planId: string): PlanDetail | null {
  const [plan] = db
    .select()
    .from(readingPlans)
    .where(eq(readingPlans.id, planId))
    .all()
  if (!plan) return null
  const days = planDaysOf(db, planId)
  const [enrollment] = db
    .select({ status: planEnrollments.status })
    .from(planEnrollments)
    .where(eq(planEnrollments.planId, planId))
    .all()
  return {
    id: plan.id,
    title: plan.title,
    status: enrollment?.status ?? "ACTIVE",
    startDate: plan.startDate,
    endDate: plan.endDate,
    totalReadings: plan.totalReadings,
    completedReadings: days.reduce(
      (total, day) =>
        total + day.readings.filter((reading) => reading.completedAt).length,
      0
    ),
    trackNames: trackNamesOf(plan.tracks),
    days,
  }
}

/** A plan's detail, kept up to date. */
export function usePlanDetail(planId: string): PlanDetail | null {
  return useLocalQuery(planTables, () => planDetail(getDatabase(), planId), [
    planId,
  ])
}

/** A plan's stored schedule with the progress, as the catch-up reads it. */
function scheduleOf(db: Database, planId: string) {
  const [plan] = db
    .select()
    .from(readingPlans)
    .where(eq(readingPlans.id, planId))
    .all()
  if (!plan) return null
  const days: ScheduleDay[] = planDaysOf(db, planId).map((day) => ({
    id: day.id,
    date: day.date,
    readings: day.readings.map(({ completedAt, ...reading }) => ({
      ...reading,
      done: completedAt !== null,
    })),
  }))
  return { plan, days }
}

export type CatchUpResult =
  | { ok: true; changes: CatchUpChanges | null }
  | { ok: false; error: "not_found" | PlanGenerationErrorCode }

/**
 * What a catch-up would change in a late plan (see planCatchUp): null when
 * nothing needs to change.
 */
export function previewCatchUp(
  db: Database,
  planId: string,
  strategy: CatchUpStrategy,
  today: IsoDate
): CatchUpResult {
  const schedule = scheduleOf(db, planId)
  if (!schedule) return { ok: false, error: "not_found" }
  try {
    return {
      ok: true,
      changes: planCatchUp(strategy, {
        days: schedule.days,
        today,
        activeWeekdays: schedule.plan.activeWeekdays,
        endDate: schedule.plan.endDate,
      }),
    }
  } catch (error) {
    if (error instanceof PlanGenerationError) {
      return { ok: false, error: error.code }
    }
    throw error
  }
}

/**
 * Brings a late plan back on schedule with a strategy, offline, as the web
 * does: readings already read keep their day and their id (their progress
 * stays), the others are moved or replaced (rebuildSchedule). The whole plan
 * goes into the outbox, the sync replacing it at once.
 */
export function catchUpPlan(
  db: Database,
  planId: string,
  strategy: CatchUpStrategy,
  today: IsoDate,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): CatchUpResult {
  const preview = previewCatchUp(db, planId, strategy, today)
  if (!preview.ok || !preview.changes) return preview
  const { plan, days } = scheduleOf(db, planId)!
  const rebuilt = rebuildSchedule(days, preview.changes, id)
  const updatedAt = now.toISOString()

  const recordDays = rebuilt.days.map((day) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    date: day.date,
    verses: day.verses,
    readings: day.readings.map(({ passage, ...reading }, position) => ({
      id: reading.id,
      position,
      track: reading.track,
      book: passage.book,
      startChapter: passage.start.chapter,
      startVerse: passage.start.verse,
      endChapter: passage.end.chapter,
      endVerse: passage.end.verse,
      verses: reading.verses,
    })),
  }))
  const record: SyncRecord<"readingPlan"> = {
    ...plan,
    endDate: rebuilt.endDate,
    totalDays: rebuilt.totalDays,
    totalReadings: rebuilt.totalReadings,
    updatedAt,
    days: recordDays,
  }
  const kept = new Set(
    recordDays.flatMap((day) => day.readings.map((reading) => reading.id))
  )
  const removedReadings = days
    .flatMap((day) => day.readings)
    .filter((reading) => !kept.has(reading.id))
    .map((reading) => reading.id)

  writeSynced(
    db,
    { table: "readingPlan", op: "upsert", record },
    (tx) => {
      for (const ids of chunks(removedReadings)) {
        tx.delete(planReadings).where(inArray(planReadings.id, ids)).run()
      }
      for (const ids of chunks(rebuilt.removedDayIds)) {
        tx.delete(planDays).where(inArray(planDays.id, ids)).run()
      }
      // Numbers must stay unique while the days are numbered again.
      tx.update(planDays)
        .set({ dayNumber: sql`-${planDays.dayNumber}` })
        .where(eq(planDays.planId, planId))
        .run()
      for (const { readings, ...day } of recordDays) {
        tx.insert(planDays)
          .values({ ...day, planId })
          .onConflictDoUpdate({
            target: planDays.id,
            set: {
              dayNumber: day.dayNumber,
              date: day.date,
              verses: day.verses,
            },
          })
          .run()
        for (const reading of readings) {
          tx.insert(planReadings)
            .values({ ...reading, dayId: day.id })
            .onConflictDoUpdate({
              target: planReadings.id,
              set: { dayId: day.id, position: reading.position },
            })
            .run()
        }
      }
      tx.update(readingPlans)
        .set({
          endDate: record.endDate,
          totalDays: record.totalDays,
          totalReadings: record.totalReadings,
          updatedAt,
        })
        .where(eq(readingPlans.id, planId))
        .run()
    },
    now
  )
  return preview
}

/** What a catch-up would change, kept up to date (for screens). */
export function useCatchUpPreview(
  planId: string,
  strategy: CatchUpStrategy,
  today: IsoDate
): CatchUpResult {
  return useLocalQuery(
    planTables,
    () => previewCatchUp(getDatabase(), planId, strategy, today),
    [planId, strategy, today]
  )
}

/** Catches up a late plan (for screens). */
export function catchUp(
  planId: string,
  strategy: CatchUpStrategy,
  today: IsoDate
): CatchUpResult {
  return catchUpPlan(getDatabase(), planId, strategy, today)
}

/** The active plans on a day, outside screens (reminders). */
export function plansOn(today: IsoDate): TodayPlan[] {
  return todayPlans(getDatabase(), today)
}
