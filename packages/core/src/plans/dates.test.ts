import { describe, expect, it } from "vitest"

import {
  addDays,
  computeActiveDates,
  daysBetween,
  getToday,
  getWeekday,
} from "./dates"
import { PlanGenerationError } from "./schema"

const weekdaysExceptSunday = [1, 2, 3, 4, 5, 6] as const

describe("date helpers", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("is not affected by daylight saving time", () => {
    // Europe switches to summer time on 2026-03-29.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30")
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31)
  })

  it("gives the weekday", () => {
    expect(getWeekday("2026-10-11")).toBe(0) // Sunday
    expect(getWeekday("2026-10-15")).toBe(4) // Thursday
  })
})

describe("computeActiveDates", () => {
  it("takes a number of active days", () => {
    // 2026-10-10 is a Saturday: the Sunday is skipped.
    expect(
      computeActiveDates({
        startDate: "2026-10-10",
        activeWeekdays: weekdaysExceptSunday,
        count: 3,
      })
    ).toEqual(["2026-10-10", "2026-10-12", "2026-10-13"])
  })

  it("takes every active day up to the end date", () => {
    const dates = computeActiveDates({
      startDate: "2026-10-01",
      activeWeekdays: [1, 3, 5],
      endDate: "2026-10-31",
    })
    expect(dates).toHaveLength(13)
    expect(dates[0]).toBe("2026-10-02")
    expect(dates.at(-1)).toBe("2026-10-30")
    expect(dates.every((date) => [1, 3, 5].includes(getWeekday(date)))).toBe(
      true
    )
  })

  it("includes the start and end dates when they are active", () => {
    expect(
      computeActiveDates({
        startDate: "2026-10-15",
        activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
        endDate: "2026-10-15",
      })
    ).toEqual(["2026-10-15"])
  })

  it("fails without any active day", () => {
    const run = () =>
      computeActiveDates({
        startDate: "2026-10-12", // Monday
        activeWeekdays: [0],
        endDate: "2026-10-17",
      })
    expect(run).toThrow(PlanGenerationError)
    expect(run).toThrow(/no_active_days/)
  })

  it("refuses an end date too far away", () => {
    expect(() =>
      computeActiveDates({
        startDate: "2026-01-01",
        activeWeekdays: [1],
        endDate: "2040-01-01",
      })
    ).toThrow(/too_long/)
  })
})

describe("getToday", () => {
  // 2026-10-15 at 23:30 UTC.
  const now = new Date("2026-10-15T23:30:00Z")

  it("follows the user's time zone", () => {
    expect(getToday("Africa/Douala", now)).toBe("2026-10-16")
    expect(getToday("America/New_York", now)).toBe("2026-10-15")
  })

  it("falls back to UTC", () => {
    expect(getToday(null, now)).toBe("2026-10-15")
    expect(getToday("Mars/Olympus", now)).toBe("2026-10-15")
  })
})
