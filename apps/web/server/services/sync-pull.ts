import "server-only"

import type { PrismaClient } from "@workspace/db"
import {
  syncTables,
  type PullResponse,
  type SyncRecord,
  type SyncTable,
} from "@workspace/sync"

import { syncAccess, type SyncDb } from "./sync-records"
import { cursorExpired } from "./sync-tombstones"

/** The synced table of each model named in the tombstones. */
const tableOfModel = new Map<string, SyncTable>(
  syncTables.map((table) => [syncAccess[table].model, table])
)

type Item =
  | { syncVersion: bigint; table: SyncTable; record: SyncRecord }
  | { syncVersion: bigint; table: SyncTable; deleted: string }

/**
 * What changed for the person since a cursor (a syncVersion), oldest
 * first: records written and records deleted (tombstones), at most `limit`.
 * The next cursor is the syncVersion of the last one given, so nothing is
 * missed or given twice whatever the phones' clocks say.
 */
export async function pullChanges(
  db: PrismaClient,
  userId: string,
  cursor: bigint,
  limit: number
): Promise<PullResponse> {
  if (await cursorExpired(db, cursor)) {
    return { changes: [], deletions: [], cursor: "0", more: true, reset: true }
  }

  // One more than asked from each source tells whether another page waits.
  const take = limit + 1
  const written = await Promise.all(
    syncTables.map(async (table) =>
      (
        await syncAccess[table].changedSince(
          db as unknown as SyncDb,
          userId,
          cursor,
          take
        )
      ).map(({ record, syncVersion }): Item => ({
        syncVersion,
        table,
        record: record as SyncRecord,
      }))
    )
  )
  const tombstones = await db.syncTombstone.findMany({
    where: { userId, syncVersion: { gt: cursor } },
    orderBy: { syncVersion: "asc" },
    take,
  })
  const deleted = tombstones.flatMap((tombstone): Item[] => {
    const table = tableOfModel.get(tombstone.table)
    return table
      ? [
          {
            syncVersion: tombstone.syncVersion,
            table,
            deleted: tombstone.recordId,
          },
        ]
      : []
  })

  const items = [...written.flat(), ...deleted].sort((a, b) =>
    a.syncVersion < b.syncVersion ? -1 : a.syncVersion > b.syncVersion ? 1 : 0
  )
  const page = items.slice(0, limit)
  const last = page.at(-1)
  // A record deleted, then written again under the same id, is only given
  // as written: the two lists of a page carry no order between them.
  const rewritten = new Set(
    page.flatMap((item) => ("record" in item ? [item.record.id] : []))
  )
  return {
    changes: page.flatMap((item) =>
      "record" in item ? [{ table: item.table, record: item.record }] : []
    ),
    deletions: page.flatMap((item) =>
      "deleted" in item && !rewritten.has(item.deleted)
        ? [{ table: item.table, id: item.deleted }]
        : []
    ),
    cursor: String(last ? last.syncVersion : cursor),
    more: items.length > limit,
    reset: false,
  }
}
