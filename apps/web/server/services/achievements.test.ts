import { describe, expect, it, vi } from "vitest"

import {
  loadAchievementHistory,
  syncAchievements,
  syncAchievementsQuietly,
  type AchievementsDb,
} from "./achievements"

function fakeDb(overrides: Record<string, unknown> = {}) {
  return {
    achievement: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    readingProgress: { findMany: vi.fn().mockResolvedValue([]) },
    prayerLog: { findMany: vi.fn().mockResolvedValue([]) },
    meditationSession: { findMany: vi.fn().mockResolvedValue([]) },
    meditationNote: { findMany: vi.fn().mockResolvedValue([]) },
    planEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  }
}
const asDb = (db: ReturnType<typeof fakeDb>) => db as unknown as AchievementsDb

describe("loadAchievementHistory", () => {
  it("reads each event in the day of the person", async () => {
    const db = fakeDb()
    // 23:30 in Paris is still the 1st; in New York it is the 1st at 18:30.
    db.prayerLog.findMany.mockResolvedValue([
      { prayedAt: new Date("2026-10-01T23:30:00Z") },
    ])
    const paris = await loadAchievementHistory(asDb(db), "u", "Europe/Paris")
    expect(paris.prayers).toEqual(["2026-10-02"])
    const ny = await loadAchievementHistory(asDb(db), "u", "America/New_York")
    expect(ny.prayers).toEqual(["2026-10-01"])
  })

  it("counts a prayer time as a prayer, and as carried to its end only if finished", async () => {
    const db = fakeDb()
    db.meditationSession.findMany.mockResolvedValue([
      {
        kind: "PRAYER",
        startedAt: new Date("2026-10-01T08:00:00Z"),
        plannedSeconds: 600,
        durationSeconds: 600,
      },
      {
        kind: "PRAYER",
        startedAt: new Date("2026-10-02T08:00:00Z"),
        plannedSeconds: 600,
        durationSeconds: 120,
      },
      {
        kind: "MEDITATION",
        startedAt: new Date("2026-10-03T08:00:00Z"),
        plannedSeconds: 600,
        durationSeconds: 100,
      },
    ])
    const history = await loadAchievementHistory(asDb(db), "u", "UTC")
    expect(history.prayers).toEqual(["2026-10-01", "2026-10-02"])
    expect(history.prayerTimes).toEqual(["2026-10-01"])
    expect(history.meditations).toEqual(["2026-10-03"])
  })

  it("finds a completed plan on the day of its last reading", async () => {
    const db = fakeDb()
    db.planEnrollment.findMany.mockResolvedValue([
      {
        plan: { totalReadings: 2 },
        progress: [
          { completedAt: new Date("2026-10-01T10:00:00Z") },
          { completedAt: new Date("2026-10-05T10:00:00Z") },
        ],
      },
      {
        plan: { totalReadings: 3 },
        progress: [{ completedAt: new Date("2026-10-01T10:00:00Z") }],
      },
    ])
    const history = await loadAchievementHistory(asDb(db), "u", "UTC")
    expect(history.completedPlans).toEqual(["2026-10-05"])
  })

  it("ignores readings of an unknown book", async () => {
    const db = fakeDb()
    db.readingProgress.findMany.mockResolvedValue([
      {
        completedAt: new Date("2026-10-01T10:00:00Z"),
        reading: {
          book: "Nope",
          startChapter: 1,
          startVerse: 1,
          endChapter: 1,
          endVerse: 2,
        },
      },
    ])
    expect(
      (await loadAchievementHistory(asDb(db), "u", "UTC")).readings
    ).toEqual([])
  })
})

describe("syncAchievements", () => {
  it("records only what is new", async () => {
    const db = fakeDb()
    db.prayerLog.findMany.mockResolvedValue(
      Array.from({ length: 10 }, () => ({
        prayedAt: new Date("2026-10-01T10:00:00Z"),
      }))
    )
    db.achievement.findMany.mockResolvedValue([
      { key: "first-prayer", level: 1 },
    ])
    const fresh = await syncAchievements(asDb(db), "u", "UTC")
    expect(fresh.map((a) => `${a.key}:${a.level}`)).toEqual(["prayer:1"])
    expect(db.achievement.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "u",
          key: "prayer",
          level: 1,
          unlockedAt: new Date("2026-10-01T00:00:00.000Z"),
        },
      ],
      skipDuplicates: true,
    })
  })

  it("writes nothing when everything is already recorded", async () => {
    const db = fakeDb()
    db.prayerLog.findMany.mockResolvedValue([
      { prayedAt: new Date("2026-10-01T10:00:00Z") },
    ])
    db.achievement.findMany.mockResolvedValue([
      { key: "first-prayer", level: 1 },
    ])
    expect(await syncAchievements(asDb(db), "u", "UTC")).toEqual([])
    expect(db.achievement.createMany).not.toHaveBeenCalled()
  })

  it("never fails the action that triggered it", async () => {
    const db = fakeDb()
    db.prayerLog.findMany.mockRejectedValue(new Error("down"))
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    expect(await syncAchievementsQuietly(asDb(db), "u", "UTC")).toEqual([])
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
