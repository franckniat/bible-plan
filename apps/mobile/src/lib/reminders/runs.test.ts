import { describe, expect, it } from "vitest"

import { planRuns, type ReminderTiming } from "./runs"

const reminder = (change: Partial<ReminderTiming> = {}): ReminderTiming => ({
  id: "r1",
  kind: "READING",
  localTime: "07:30",
  timezone: "Africa/Douala",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  enabled: true,
  ...change,
})

// Friday 30 October 2026, 08:00 in Douala (UTC+1).
const now = new Date("2026-10-30T07:00:00.000Z")

describe("planRuns", () => {
  it("schedules the next runs of a week, at the local time", () => {
    const runs = planRuns([reminder()], now)
    expect(runs).toHaveLength(7)
    // Today's 07:30 is past: tomorrow first.
    expect(runs[0]!.at.toISOString()).toBe("2026-10-31T06:30:00.000Z")
  })

  it("follows the weekdays and leaves disabled reminders out", () => {
    const runs = planRuns(
      [
        reminder({ weekdays: [1], kind: "MEDITATION" }),
        reminder({ id: "off", enabled: false }),
      ],
      now
    )
    expect(runs).toEqual([
      {
        reminderId: "r1",
        kind: "MEDITATION",
        at: new Date("2026-11-02T06:30:00.000Z"),
      },
    ])
  })

  it("keeps the soonest runs under the limit", () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      reminder({ id: `r${index}` })
    )
    const runs = planRuns(many, now)
    expect(runs).toHaveLength(56)
    expect(runs.at(-1)!.at.getTime()).toBeLessThanOrEqual(
      new Date("2026-11-06T06:30:00.000Z").getTime()
    )
  })
})
