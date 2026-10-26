import "server-only"

import type { PrismaClient } from "@workspace/db"

/**
 * How long a tombstone is kept. A phone that has not synced for longer
 * cannot learn of the deletions in between: the sync starts it over from
 * scratch instead (a cursor older than the oldest tombstone).
 */
export const tombstoneRetentionDays = 90

/** Deletes the tombstones older than the retention period. */
export async function purgeOldTombstones(
  db: Pick<PrismaClient, "syncTombstone">,
  now = new Date()
): Promise<number> {
  const limit = new Date(
    now.getTime() - tombstoneRetentionDays * 24 * 60 * 60 * 1000
  )
  const { count } = await db.syncTombstone.deleteMany({
    where: { deletedAt: { lt: limit } },
  })
  return count
}
