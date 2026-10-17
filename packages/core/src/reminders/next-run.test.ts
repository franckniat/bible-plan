import { describe, expect, it } from "vitest"

import { nextReminderRun, type ReminderSchedule } from "./next-run"

const everyDay = [0, 1, 2, 3, 4, 5, 6] as const
const run = (schedule: ReminderSchedule, after: string) =>
  nextReminderRun(schedule, new Date(after))?.toISOString() ?? null

describe("nextReminderRun", () => {
  const paris: ReminderSchedule = {
    localTime: "07:00",
    timeZone: "Europe/Paris",
    weekdays: everyDay,
  }

  it("fires later today when the time is still ahead", () => {
    // 2026-01-15 05:00 UTC is 06:00 in Paris.
    expect(run(paris, "2026-01-15T05:00:00Z")).toBe("2026-01-15T06:00:00.000Z")
  })

  it("fires tomorrow once the time has passed or is now", () => {
    expect(run(paris, "2026-01-15T06:00:00Z")).toBe("2026-01-16T06:00:00.000Z")
    expect(run(paris, "2026-01-15T10:00:00Z")).toBe("2026-01-16T06:00:00.000Z")
  })

  it("reads the day in the time zone, not in UTC", () => {
    // 2026-01-15 23:30 UTC is already the 16th in Paris (00:30).
    expect(run(paris, "2026-01-15T23:30:00Z")).toBe("2026-01-16T06:00:00.000Z")
    // Los Angeles is still on the 15th (15:30).
    expect(
      run({ ...paris, timeZone: "America/Los_Angeles" }, "2026-01-15T23:30:00Z")
    ).toBe("2026-01-16T15:00:00.000Z")
  })

  it("skips the days that are not active", () => {
    // Monday and Thursday only. 2026-01-15 is a Thursday, past 7:00.
    const schedule = { ...paris, weekdays: [1, 4] as const }
    expect(run(schedule, "2026-01-15T10:00:00Z")).toBe(
      "2026-01-19T06:00:00.000Z"
    )
  })

  it("comes back a week later when only today is active", () => {
    const schedule = { ...paris, weekdays: [4] as const }
    expect(run(schedule, "2026-01-15T10:00:00Z")).toBe(
      "2026-01-22T06:00:00.000Z"
    )
  })

  it("has no next run without an active weekday", () => {
    expect(nextReminderRun({ ...paris, weekdays: [] })).toBeNull()
  })
})

describe("nextReminderRun across clock changes", () => {
  const at = (localTime: ReminderSchedule["localTime"], timeZone: string) => ({
    localTime,
    timeZone,
    weekdays: everyDay,
  })

  it("keeps 7:00 in Paris when summer time starts", () => {
    // Clocks go forward on 2026-03-29 (02:00 → 03:00).
    const schedule = at("07:00", "Europe/Paris")
    expect(run(schedule, "2026-03-28T06:00:00Z")).toBe(
      "2026-03-29T05:00:00.000Z"
    )
    expect(run(schedule, "2026-03-29T05:00:00Z")).toBe(
      "2026-03-30T05:00:00.000Z"
    )
  })

  it("keeps 7:00 in Paris when summer time ends", () => {
    // Clocks go back on 2026-10-25 (03:00 → 02:00).
    const schedule = at("07:00", "Europe/Paris")
    expect(run(schedule, "2026-10-24T05:00:00Z")).toBe(
      "2026-10-25T06:00:00.000Z"
    )
  })

  it("moves a time that does not exist to just after the gap", () => {
    // 02:30 does not exist in Paris on 2026-03-29: it fires at 03:30.
    expect(run(at("02:30", "Europe/Paris"), "2026-03-28T01:30:00Z")).toBe(
      "2026-03-29T01:30:00.000Z"
    )
  })

  it("fires once, at the first occurrence, when a time happens twice", () => {
    // 02:30 happens at 00:30 UTC (summer) and 01:30 UTC (winter) on 2026-10-25.
    const schedule = at("02:30", "Europe/Paris")
    expect(run(schedule, "2026-10-24T01:00:00Z")).toBe(
      "2026-10-25T00:30:00.000Z"
    )
    expect(run(schedule, "2026-10-25T00:30:00Z")).toBe(
      "2026-10-26T01:30:00.000Z"
    )
  })

  it("follows the other hemisphere and the American dates", () => {
    expect(run(at("07:00", "America/New_York"), "2026-03-07T12:00:00Z")).toBe(
      "2026-03-08T11:00:00.000Z"
    )
    // Sydney leaves summer time on 2026-04-05.
    expect(run(at("07:00", "Australia/Sydney"), "2026-04-03T20:00:00Z")).toBe(
      "2026-04-04T21:00:00.000Z"
    )
  })

  it("does not move in a time zone without summer time", () => {
    const schedule = at("07:00", "Africa/Douala")
    expect(run(schedule, "2026-03-29T00:00:00Z")).toBe(
      "2026-03-29T06:00:00.000Z"
    )
    expect(run(schedule, "2026-10-25T00:00:00Z")).toBe(
      "2026-10-25T06:00:00.000Z"
    )
  })

  it("stays at 7:00 on the wall clock every day of a year", () => {
    const schedule = at("07:00", "Europe/Paris")
    const wall = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    })
    let after = new Date("2026-01-01T00:00:00Z")
    for (let day = 0; day < 400; day++) {
      const next = nextReminderRun(schedule, after)!
      expect(wall.format(next)).toBe("07:00")
      expect(next.getTime()).toBeGreaterThan(after.getTime())
      after = next
    }
  })
})
