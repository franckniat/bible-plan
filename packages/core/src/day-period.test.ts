import { describe, expect, it } from "vitest"

import { currentPeriod, periodOfHour } from "./day-period"

describe("periodOfHour", () => {
  it.each([
    [0, "night"],
    [4, "night"],
    [5, "morning"],
    [10, "morning"],
    [11, "day"],
    [17, "day"],
    [18, "night"],
    [23, "night"],
  ] as const)("%i h is %s", (hour, period) => {
    expect(periodOfHour(hour)).toBe(period)
  })
})

describe("currentPeriod", () => {
  const now = new Date("2026-10-17T07:30:00Z")

  it("reads the hour in the given time zone", () => {
    expect(currentPeriod("UTC", now)).toBe("morning")
    expect(currentPeriod("Africa/Douala", now)).toBe("morning") // 8:30
    expect(currentPeriod("America/Los_Angeles", now)).toBe("night") // 0:30
    expect(currentPeriod("Asia/Tokyo", now)).toBe("day") // 16:30
  })

  it("does not fail on an unknown time zone", () => {
    expect(["morning", "day", "night"]).toContain(
      currentPeriod("Not/AZone", now)
    )
  })
})
