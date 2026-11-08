import "server-only"

import type { PrismaClient } from "@workspace/db"
import {
  decidePush,
  deletedVersion,
  writtenVersion,
  type PushResponse,
  type RecordVersion,
  type SyncChange,
  type SyncRecord,
  type SyncTable,
} from "@workspace/sync"

import { syncAccess, type SyncDb } from "./sync-records"

export type SyncPushDb = Pick<PrismaClient, "$transaction">

/** The server's version of a record: kept, deleted (a tombstone), or none. */
async function versionById<T extends SyncTable>(
  db: SyncDb,
  userId: string,
  table: T,
  id: string
): Promise<RecordVersion<T> | "forbidden" | null> {
  const access = syncAccess[table]
  const stored = await access.find(db, id)
  if (stored) {
    if (stored.ownerId !== userId) return "forbidden"
    return writtenVersion(table, stored.record)
  }
  const tombstone = await db.syncTombstone.findFirst({
    where: { userId, table: access.model, recordId: id },
    orderBy: { syncVersion: "desc" },
  })
  if (!tombstone) return null
  return {
    ...deletedVersion(
      table,
      { id } as SyncRecord<T>,
      tombstone.deletedAt.toISOString()
    ),
    key: `${table}:${id}`,
  }
}

/**
 * Applies the changes pushed by a phone, each in its own transaction and in
 * the order sent (a plan before its progress): a change is written, or
 * refused with its reason; when the server keeps its own version, it is
 * sent back to the phone. Replaying a push changes nothing.
 */
export async function applyPush(
  db: SyncPushDb,
  userId: string,
  changes: readonly SyncChange[],
  now: Date = new Date()
): Promise<PushResponse> {
  const response: PushResponse = { accepted: [], rejected: [], merged: [] }
  for (const change of changes) {
    const table = change.table
    const access = syncAccess[table] as (typeof syncAccess)[SyncTable]
    try {
      const outcome = await db.$transaction(async (tx) => {
        const byId = await versionById(tx, userId, table, change.id)
        if (byId === "forbidden") return { reason: "forbidden" as const }
        const record =
          change.op === "upsert" ? (change.data as SyncRecord) : null
        const same = record
          ? await access.findSame(tx, userId, record as never)
          : null
        const decision = decidePush(
          change,
          byId,
          same && same.id !== change.id
            ? writtenVersion(table, same as never)
            : null
        )
        switch (decision.action) {
          case "none":
            return { accepted: true as const }
          case "stale":
            return { reason: "stale" as const, current: decision.current }
          case "delete":
            await access.remove(tx, change.id)
            return { accepted: true as const }
          case "write": {
            const stored =
              byId && !byId.deleted ? (byId.record as SyncRecord) : null
            if (
              !(await access.allowed(
                tx,
                userId,
                decision.record as never,
                stored as never
              ))
            ) {
              return { reason: "invalid" as const }
            }
            if (decision.replaces) await access.remove(tx, decision.replaces)
            await access.write(
              tx,
              userId,
              decision.record as never,
              stored as never,
              now
            )
            return { accepted: true as const }
          }
        }
      })
      if ("accepted" in outcome) {
        response.accepted.push(change.id)
      } else {
        response.rejected.push({ id: change.id, reason: outcome.reason })
        if ("current" in outcome && outcome.current) {
          response.merged.push({ table, record: outcome.current })
        }
      }
    } catch (error) {
      // A rule of the database refused it (a missing parent…).
      console.error(`Sync push of ${table} ${change.id} failed`, error)
      response.rejected.push({ id: change.id, reason: "invalid" })
    }
  }
  return response
}

/** The tables whose changes count in the activity and the trophies. */
export const activityTables: readonly SyncTable[] = [
  "readingProgress",
  "prayerLog",
  "meditationSession",
]
