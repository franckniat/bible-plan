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
