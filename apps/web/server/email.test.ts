import { describe, expect, it, vi } from "vitest"

import { createPrismaEmailQuotaStore } from "./email"

function fakeDb(sent?: number) {
  const emailDailyUsage = {
    findUnique: vi.fn().mockResolvedValue(sent === undefined ? null : { sent }),
    upsert: vi.fn(),
  }
  return { db: { emailDailyUsage } as never, emailDailyUsage }
}

const day = new Date("2026-10-10T00:00:00Z")

describe("createPrismaEmailQuotaStore", () => {
  it("reads the count of a UTC day, zero when nothing was sent", async () => {
    const empty = fakeDb()
    await expect(
      createPrismaEmailQuotaStore(empty.db).countSent("2026-10-10")
    ).resolves.toBe(0)
    expect(empty.emailDailyUsage.findUnique).toHaveBeenCalledWith({
      where: { day },
    })

    const used = fakeDb(42)
    await expect(
      createPrismaEmailQuotaStore(used.db).countSent("2026-10-10")
    ).resolves.toBe(42)
  })

  it("increments the day counter atomically", async () => {
    const { db, emailDailyUsage } = fakeDb()
    await createPrismaEmailQuotaStore(db).recordSent("2026-10-10")
    expect(emailDailyUsage.upsert).toHaveBeenCalledWith({
      where: { day },
      create: { day, sent: 1 },
      update: { sent: { increment: 1 } },
    })
  })
})
