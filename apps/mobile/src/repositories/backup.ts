import {
  recordSchemas,
  syncTables,
  type SyncRecord,
  type SyncTable,
} from "@workspace/sync"
import { z } from "zod"

import { getDatabase } from "@/db/client"
import * as schema from "@/db/schema"
import type { Database } from "@/db/types"

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

/** The backup of this phone's database (for screens). */
export function currentBackup(): Backup {
  return exportBackup(getDatabase())
}
