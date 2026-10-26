import { describe, expect, it, vi } from "vitest"

import { purgeOldTombstones } from "./sync-tombstones"

describe("purgeOldTombstones", () => {
  it("deletes the tombstones older than 90 days", async () => {
    const syncTombstone = {
      deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
    }
    const now = new Date("2026-10-27T12:00:00Z")
    expect(await purgeOldTombstones({ syncTombstone } as never, now)).toBe(3)
    expect(syncTombstone.deleteMany).toHaveBeenCalledWith({
      where: { deletedAt: { lt: new Date("2026-07-29T12:00:00Z") } },
    })
  })
})
