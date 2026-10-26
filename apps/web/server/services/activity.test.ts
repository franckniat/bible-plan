import { describe, expect, it, vi } from "vitest"

import type { ActivityDb, ActivityEventsDb } from "./activity"
import { activityTotals, listActivity, refreshActivity } from "./activity"

const dbOf = (activityDay: Record<string, unknown>) =>
  ({ activityDay }) as unknown as ActivityDb

describe("refreshActivity", () => {
  it("stores the days computed from the events, in the person's time zone", async () => {
    const activityDay = {
      deleteMany: vi.fn().mockReturnValue("delete"),
      createMany: vi.fn().mockReturnValue("create"),
    }
    const db = {
      activityDay,
      readingProgress: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { completedAt: new Date("2026-10-19T23:30:00Z") },
            { completedAt: new Date("2026-10-20T08:00:00Z") },
          ]),
      },
      prayerLog: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ prayedAt: new Date("2026-10-20T09:00:00Z") }]),
      },
      meditationSession: {
        findMany: vi.fn().mockResolvedValue([
          {
            kind: "PRAYER",
            durationSeconds: 900,
            createdAt: new Date("2026-10-20T10:00:00Z"),
          },
        ]),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as ActivityEventsDb

    await refreshActivity(db, "user-1", "Africa/Douala")

    expect(activityDay.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
    // 23:30 UTC on October 19 is already October 20 in Douala.
    expect(activityDay.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          day: new Date("2026-10-20T00:00:00Z"),
          readings: 2,
          prayers: 2,
          meditationSeconds: 0,
          prayerSeconds: 900,
        },
      ],
    })
    expect(db.$transaction).toHaveBeenCalledWith(["delete", "create"])
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
      await listActivity(
        dbOf(activityDay),
        "user-1",
        "2026-10-01",
        "2026-10-31"
      )
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
