import { describe, expect, it, vi } from "vitest"

import { cursorExpired, purgeOldTombstones } from "./sync-tombstones"

/** A database whose old tombstones go up to syncVersion `upTo`. */
function fakeDb(upTo: bigint | null, purged: bigint | null = null) {
  const tx = {
    syncTombstone: {
      aggregate: vi.fn().mockResolvedValue({ _max: { syncVersion: upTo } }),
      deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    syncPurge: {
      findUnique: vi
        .fn()
        .mockResolvedValue(purged === null ? null : { id: 1, upTo: purged }),
      upsert: vi.fn(),
    },
  }
  const db = { $transaction: (run: (t: typeof tx) => unknown) => run(tx) }
  return { db: db as never, tx }
}

const now = new Date("2026-10-27T12:00:00Z")

describe("purgeOldTombstones", () => {
  it("deletes the tombstones older than 90 days and remembers how far", async () => {
    const { db, tx } = fakeDb(42n)
    expect(await purgeOldTombstones(db, now)).toBe(3)
    expect(tx.syncTombstone.deleteMany).toHaveBeenCalledWith({
      where: { deletedAt: { lt: new Date("2026-07-29T12:00:00Z") } },
    })
    expect(tx.syncPurge.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, upTo: 42n },
      update: { upTo: 42n },
    })
  })

  it("does nothing when no tombstone is that old", async () => {
    const { db, tx } = fakeDb(null, 10n)
    expect(await purgeOldTombstones(db, now)).toBe(0)
    expect(tx.syncTombstone.deleteMany).not.toHaveBeenCalled()
    expect(tx.syncPurge.upsert).not.toHaveBeenCalled()
  })
})

describe("cursorExpired", () => {
  const purge = (upTo: bigint | null) =>
    ({
      syncPurge: {
        findUnique: async () => (upTo === null ? null : { id: 1, upTo }),
      },
    }) as never

  it("starts over a phone that missed purged deletions", async () => {
    expect(await cursorExpired(purge(42n), 10n)).toBe(true)
    expect(await cursorExpired(purge(42n), 42n)).toBe(false)
    expect(await cursorExpired(purge(null), 10n)).toBe(false)
    expect(await cursorExpired(purge(42n), 0n)).toBe(false)
  })
})
