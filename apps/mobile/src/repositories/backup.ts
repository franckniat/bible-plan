import {
  recordSchemas,
  syncTables,
  type SyncRecord,
  type SyncTable,
} from "@workspace/sync"
import { z } from "zod"

import { notifyChange } from "@/db/changes"
import { getDatabase } from "@/db/client"
import * as schema from "@/db/schema"
import type { Database } from "@/db/types"

import { chunks } from "./plans"
import { writeSynced, type LocalChange } from "./write"

/**
 * A backup of what is only on this phone without an account: every synced
 * record, in the shape the sync exchanges (@workspace/sync), and the
 * bookmarks. What belongs to the phone itself (its notifications, its
 * reading settings) is left out.
 */
export type Backup = {
  format: "bible-plan-backup"
  version: 1
  exportedAt: string
  records: { [T in SyncTable]: SyncRecord<T>[] }
  bookmarks: { slug: string; createdAt: string }[]
}

/** The local table of each synced record (a plan's days and readings apart). */
const tableOf = {
  readingPlan: schema.readingPlans,
  planEnrollment: schema.planEnrollments,
  readingProgress: schema.readingProgress,
  prayerRequest: schema.prayerRequests,
  prayerLog: schema.prayerLogs,
  meditationSession: schema.meditationSessions,
  meditationNote: schema.meditationNotes,
  highlight: schema.highlights,
  reminder: schema.reminders,
  achievement: schema.achievements,
} as const satisfies Record<SyncTable, unknown>

function groupBy<T>(rows: readonly T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const group = groups.get(key(row))
    if (group) group.push(row)
    else groups.set(key(row), [row])
  }
  return groups
}

/** The plans with their days and readings, as one record each. */
function planRecords(db: Database): SyncRecord<"readingPlan">[] {
  const readings = groupBy(
    db.select().from(schema.planReadings).all(),
    (reading) => reading.dayId
  )
  const days = groupBy(
    db.select().from(schema.planDays).all(),
    (day) => day.planId
  )
  return db
    .select()
    .from(schema.readingPlans)
    .all()
    .map((plan) =>
      recordSchemas.readingPlan.parse({
        ...plan,
        days: (days.get(plan.id) ?? [])
          .sort((a, b) => a.dayNumber - b.dayNumber)
          .map((day) => ({
            ...day,
            readings: (readings.get(day.id) ?? []).sort(
              (a, b) => a.position - b.position
            ),
          })),
      })
    )
}

/** Everything to back up, ready to be written as JSON. */
export function exportBackup(db: Database, now: Date = new Date()): Backup {
  const records = Object.fromEntries(
    syncTables.map((table) => [
      table,
      table === "readingPlan"
        ? planRecords(db)
        : db
            .select()
            .from(tableOf[table])
            .all()
            // The schema keeps the synced fields only (no `seenAt`).
            .map((row) => recordSchemas[table].parse(row)),
    ])
  ) as Backup["records"]
  return {
    format: "bible-plan-backup",
    version: 1,
    exportedAt: now.toISOString(),
    records,
    bookmarks: db.select().from(schema.bookmarks).all(),
  }
}

/** What a backup file must hold to be read back. */
export const backupSchema = z.object({
  format: z.literal("bible-plan-backup"),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  records: z.object(
    Object.fromEntries(
      syncTables.map((table) => [
        table,
        z.array(recordSchemas[table]).default([]),
      ])
    ) as {
      [T in SyncTable]: z.ZodDefault<z.ZodArray<(typeof recordSchemas)[T]>>
    }
  ),
  bookmarks: z
    .array(z.object({ slug: z.string().min(1), createdAt: z.iso.datetime() }))
    .default([]),
})

/** Reads a backup file; throws when it is not one (or a damaged one). */
export function parseBackup(text: string): Backup {
  return backupSchema.parse(JSON.parse(text))
}

/** Inserts rows in a table, as many at once as SQLite takes. */
function insertRows(tx: Database, table: object, rows: readonly object[]) {
  const into = tx.insert(table as typeof schema.highlights)
  for (const part of chunks(rows)) into.values(part as never).run()
}

/**
 * Adds a backup's records to this phone, each one once: a record already
 * here (the same id, or the same verse, trophy or reading marked as read)
 * is kept as it is, so importing twice adds nothing. What is added goes into
 * the outbox, as if written here, for an account to push it later.
 * Gives the number of records added.
 */
export function importBackup(
  db: Database,
  backup: Backup,
  now: Date = new Date()
): number {
  const ids = (table: { id: unknown }) =>
    new Set(
      db
        .select({ id: table.id as typeof schema.highlights.id })
        .from(table as typeof schema.highlights)
        .all()
        .map((row) => row.id)
    )
  const fresh = <T extends SyncTable>(table: T) => {
    const here = ids(tableOf[table])
    return backup.records[table].filter((record) => !here.has(record.id))
  }

  const plans = fresh("readingPlan")
  const planIds = new Set([
    ...ids(schema.readingPlans),
    ...plans.map((plan) => plan.id),
  ])
  const enrollments = fresh("planEnrollment").filter((enrollment) =>
    planIds.has(enrollment.planId)
  )
  const enrollmentIds = new Set([
    ...ids(schema.planEnrollments),
    ...enrollments.map((enrollment) => enrollment.id),
  ])
  const readingIds = new Set([
    ...ids(schema.planReadings),
    ...plans.flatMap((plan) =>
      plan.days.flatMap((day) => day.readings.map((reading) => reading.id))
    ),
  ])
  const read = new Set(
    db
      .select()
      .from(schema.readingProgress)
      .all()
      .map((row) => `${row.enrollmentId} ${row.readingId}`)
  )
  const progress = fresh("readingProgress").filter(
    (row) =>
      enrollmentIds.has(row.enrollmentId) &&
      readingIds.has(row.readingId) &&
      !read.has(`${row.enrollmentId} ${row.readingId}`)
  )
  const verses = new Set(
    db
      .select()
      .from(schema.highlights)
      .all()
      .map((row) => `${row.book}.${row.chapter}.${row.verse}`)
  )
  const highlights = fresh("highlight").filter(
    (row) => !verses.has(`${row.book}.${row.chapter}.${row.verse}`)
  )
  const levels = new Set(
    db
      .select()
      .from(schema.achievements)
      .all()
      .map((row) => `${row.key} ${row.level}`)
  )
  const achievements = fresh("achievement").filter(
    (row) => !levels.has(`${row.key} ${row.level}`)
  )
  const added = {
    readingPlan: plans,
    planEnrollment: enrollments,
    readingProgress: progress,
    prayerRequest: fresh("prayerRequest"),
    prayerLog: fresh("prayerLog"),
    meditationSession: fresh("meditationSession"),
    meditationNote: fresh("meditationNote"),
    highlight: highlights,
    reminder: fresh("reminder"),
    achievement: achievements,
  } satisfies Backup["records"]

  const marked = new Set(
    db
      .select()
      .from(schema.bookmarks)
      .all()
      .map((row) => row.slug)
  )
  const bookmarks = backup.bookmarks.filter((row) => !marked.has(row.slug))

  const changes = syncTables.flatMap((table) =>
    added[table].map(
      (record): LocalChange => ({ table, op: "upsert", record }) as LocalChange
    )
  )
  writeSynced(
    db,
    changes,
    (tx) => {
      // Parents first: plans, their days and readings, then the rest.
      insertRows(tx, schema.readingPlans, plans)
      const days = plans.flatMap((plan) =>
        plan.days.map((day) => ({ ...day, planId: plan.id }))
      )
      insertRows(tx, schema.planDays, days)
      insertRows(
        tx,
        schema.planReadings,
        days.flatMap((day) =>
          day.readings.map((reading) => ({ ...reading, dayId: day.id }))
        )
      )
      for (const table of syncTables) {
        if (table === "readingPlan") continue
        insertRows(
          tx,
          tableOf[table],
          table === "achievement"
            ? // Trophies already celebrated where they were earned.
              achievements.map((row) => ({ ...row, seenAt: now.toISOString() }))
            : added[table]
        )
      }
      insertRows(tx, schema.bookmarks, bookmarks)
    },
    now
  )
  if (bookmarks.length > 0) notifyChange("bookmark")
  return changes.length + bookmarks.length
}

/** The backup of this phone's database (for screens). */
export function currentBackup(): Backup {
  return exportBackup(getDatabase())
}

/** Adds a backup file's records to this phone (for screens). */
export function restoreBackup(text: string): number {
  return importBackup(getDatabase(), parseBackup(text))
}
