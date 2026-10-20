import { describe, expect, it, vi } from "vitest"

import type { ActivityDb } from "./activity"
import { activityTotals, listActivity, recordActivity } from "./activity"

const dbOf = (activityDay: Record<string, unknown>) =>
  ({ activityDay }) as unknown as ActivityDb

describe("recordActivity", () => {
  it("adds to the day of the person, creating it when needed", async () => {
    const activityDay = { upsert: vi.fn().mockResolvedValue({}) }
    await recordActivity(dbOf(activityDay), "user-1", "2026-10-20", {
      prayers: 1,
      meditationSeconds: 600,
    })
    expect(activityDay.upsert).toHaveBeenCalledWith({
      where: {
        userId_day: { userId: "user-1", day: new Date("2026-10-20T00:00:00Z") },
      },
      create: {
        userId: "user-1",
        day: new Date("2026-10-20T00:00:00Z"),
        readings: 0,
        prayers: 1,
        meditationSeconds: 600,
        prayerSeconds: 0,
      },
      update: {
        prayers: { increment: 1 },
        meditationSeconds: { increment: 600 },
      },
    })
  })

  it("takes back a reading without going under zero", async () => {
    const activityDay = {
      upsert: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    }
    await recordActivity(dbOf(activityDay), "user-1", "2026-10-20", {
      readings: -1,
    })
    expect(activityDay.upsert).not.toHaveBeenCalled()
    expect(activityDay.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        day: new Date("2026-10-20T00:00:00Z"),
        readings: { gt: 0 },
      },
      data: { readings: { decrement: 1 } },
    })
  })
})

describe("listActivity", () => {
  it("gives dates as plain days and leaves out empty ones", async () => {
    const activityDay = {
      findMany: vi.fn().mockResolvedValue([
        {
          day: new Date("2026-10-19T00:00:00Z"),
          readings: 1,
          prayers: 0,
          meditationSeconds: 0,
          prayerSeconds: 0,
        },
        {
          day: new Date("2026-10-20T00:00:00Z"),
          readings: 0,
          prayers: 0,
          meditationSeconds: 0,
        },
      ]),
    }
    expect(
      await listActivity(dbOf(activityDay), "user-1", "2026-10-01", "2026-10-31")
    ).toEqual([
      {
        day: "2026-10-19",
        readings: 1,
        prayers: 0,
        meditationSeconds: 0,
        prayerSeconds: 0,
      },
    ])
  })
})

describe("activityTotals", () => {
  it("sums what was done, with zero for nothing", async () => {
    const activityDay = {
      aggregate: vi.fn().mockResolvedValue({
        _sum: {
          readings: null,
          prayers: 4,
          meditationSeconds: 900,
          prayerSeconds: 3600,
        },
      }),
      count: vi.fn().mockResolvedValue(3),
    }
    expect(await activityTotals(dbOf(activityDay), "user-1")).toEqual({
      readings: 0,
      prayers: 4,
      meditationSeconds: 900,
      prayerSeconds: 3600,
      activeDays: 3,
    })
  })
})
