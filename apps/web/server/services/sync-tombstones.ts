import "server-only"

import type { PrismaClient } from "@workspace/db"

/**
 * How long a tombstone is kept. A phone that has not synced for longer
 * cannot learn of the deletions in between: the sync starts it over from
 * scratch instead (a cursor older than the tombstones purged, SyncPurge).
 */
export const tombstoneRetentionDays = 90

/**
 * Deletes the tombstones older than the retention period, and remembers
 * the largest syncVersion purged.
 */
export async function purgeOldTombstones(
  db: Pick<PrismaClient, "$transaction">,
  now = new Date()
): Promise<number> {
  const limit = new Date(
    now.getTime() - tombstoneRetentionDays * 24 * 60 * 60 * 1000
  )
  return db.$transaction(async (tx) => {
    const where = { deletedAt: { lt: limit } }
    const { _max } = await tx.syncTombstone.aggregate({
      where,
      _max: { syncVersion: true },
    })
    if (_max.syncVersion === null) return 0
    const { count } = await tx.syncTombstone.deleteMany({ where })
    const purge = await tx.syncPurge.findUnique({ where: { id: 1 } })
    if (!purge || purge.upTo < _max.syncVersion) {
      await tx.syncPurge.upsert({
        where: { id: 1 },
        create: { id: 1, upTo: _max.syncVersion },
        update: { upTo: _max.syncVersion },
      })
    }
    return count
  })
}

/** Whether a cursor is older than the tombstones purged: start over. */
export async function cursorExpired(
  db: Pick<PrismaClient, "syncPurge">,
  cursor: bigint
): Promise<boolean> {
  if (cursor === 0n) return false
  const purge = await db.syncPurge.findUnique({ where: { id: 1 } })
  return purge !== null && cursor < purge.upTo
}
