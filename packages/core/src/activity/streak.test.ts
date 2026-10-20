import { describe, expect, it } from "vitest"

import { getToday } from "../plans/dates"
import { computeStreak } from "./streak"

describe("computeStreak", () => {
  it("is empty without activity", () => {
    expect(computeStreak([], "2026-10-20")).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
    })
  })

  it("counts the days in a row up to today", () => {
    expect(
      computeStreak(["2026-10-18", "2026-10-19", "2026-10-20"], "2026-10-20")
    ).toEqual({ current: 3, longest: 3, activeToday: true })
  })

  it("keeps a streak alive until the end of the day after the last activity", () => {
    expect(computeStreak(["2026-10-18", "2026-10-19"], "2026-10-20")).toEqual({
      current: 2,
      longest: 2,
      activeToday: false,
    })
  })

  it("breaks after a missed day, and remembers the longest run", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-19"]
    expect(computeStreak(days, "2026-10-20")).toEqual({
      current: 1,
      longest: 3,
      activeToday: false,
    })
    expect(computeStreak(days, "2026-10-21")).toMatchObject({
      current: 0,
      longest: 3,
    })
  })

  it("counts a day once, whatever the order and the repeats", () => {
    expect(
      computeStreak(
        ["2026-10-20", "2026-10-19", "2026-10-20", "2026-10-19"],
        "2026-10-20"
      ).current
    ).toBe(2)
  })

  it("runs across a month and a year end", () => {
    expect(
      computeStreak(["2025-12-30", "2025-12-31", "2026-01-01"], "2026-01-01")
        .current
    ).toBe(3)
    expect(
      computeStreak(["2028-02-28", "2028-02-29", "2028-03-01"], "2028-03-01")
        .current
    ).toBe(3)
  })

  it("ignores days after today", () => {
    expect(computeStreak(["2026-10-21", "2026-10-22"], "2026-10-20")).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
    })
  })
})

describe("streaks around local midnight", () => {
  // 23:30 in Paris (UTC+2 in October) is 21:30 UTC; 00:30 the next day in
  // Paris is still the day before in UTC.
  const lateEvening = new Date("2026-10-19T21:30:00Z")
  const justAfterMidnight = new Date("2026-10-19T22:30:00Z")

  it("puts an activity in the day of the person, not in UTC's", () => {
    expect(getToday("Europe/Paris", lateEvening)).toBe("2026-10-19")
    expect(getToday("Europe/Paris", justAfterMidnight)).toBe("2026-10-20")
    expect(getToday("UTC", justAfterMidnight)).toBe("2026-10-19")
  })

  it("keeps a streak going across the local midnight", () => {
    const activity = [getToday("Europe/Paris", lateEvening)]
    // Right after local midnight the streak is still alive, but not yet today.
    expect(
      computeStreak(activity, getToday("Europe/Paris", justAfterMidnight))
    ).toEqual({ current: 1, longest: 1, activeToday: false })
    // Read in the new day too: two days in a row.
    activity.push(getToday("Europe/Paris", justAfterMidnight))
    expect(
      computeStreak(activity, getToday("Europe/Paris", justAfterMidnight))
    ).toMatchObject({ current: 2, activeToday: true })
  })

  it("does not break for a person far west of UTC late in the evening", () => {
    // 20:00 in Los Angeles (UTC-7) on 19 October is already 20 October in UTC.
    const evening = new Date("2026-10-20T03:00:00Z")
    expect(getToday("America/Los_Angeles", evening)).toBe("2026-10-19")
    expect(
      computeStreak(["2026-10-18", "2026-10-19"], getToday("America/Los_Angeles", evening))
    ).toMatchObject({ current: 2, activeToday: true })
  })

  it("follows the change of clock without skipping or doubling a day", () => {
    // Paris goes back to winter time on 25 October 2026.
    const before = new Date("2026-10-24T22:30:00Z") // 00:30 on the 25th
    const after = new Date("2026-10-25T23:30:00Z") // 00:30 on the 26th
    expect(getToday("Europe/Paris", before)).toBe("2026-10-25")
    expect(getToday("Europe/Paris", after)).toBe("2026-10-26")
  })
})
