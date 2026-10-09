import { describe, expect, it } from "vitest"

import {
  defaultLocale,
  isoDateSchema,
  localeSchema,
  locales,
  timeOfDaySchema,
  timeZoneSchema,
  weekdaysSchema,
} from "./common"

describe("isoDateSchema", () => {
  it("accepts calendar dates", () => {
    expect(isoDateSchema.parse("2026-10-09")).toBe("2026-10-09")
    expect(isoDateSchema.safeParse("2028-02-29").success).toBe(true)
  })

  it("rejects invalid dates and datetimes", () => {
    for (const value of [
      "2026-13-01",
      "2026-02-30",
      "2027-02-29",
      "09/10/2026",
      "2026-10-09T07:00:00Z",
    ]) {
      expect(isoDateSchema.safeParse(value).success, value).toBe(false)
    }
  })
})

describe("timeOfDaySchema", () => {
  it("accepts 24-hour HH:mm times", () => {
    for (const value of ["00:00", "07:05", "12:30", "23:59"]) {
      expect(timeOfDaySchema.safeParse(value).success, value).toBe(true)
    }
  })

  it("rejects other formats", () => {
    for (const value of ["24:00", "7:05", "07:60", "07:05:00", "7h05"]) {
      expect(timeOfDaySchema.safeParse(value).success, value).toBe(false)
    }
  })
})

describe("localeSchema", () => {
  it("accepts supported locales only", () => {
    expect(locales).toContain(defaultLocale)
    expect(localeSchema.safeParse("fr").success).toBe(true)
    expect(localeSchema.safeParse("en").success).toBe(true)
    expect(localeSchema.safeParse("de").success).toBe(false)
  })
})

describe("timeZoneSchema", () => {
  it("accepts IANA time zones", () => {
    for (const value of [
      "Europe/Paris",
      "Africa/Douala",
      "America/New_York",
      "UTC",
    ]) {
      expect(timeZoneSchema.safeParse(value).success, value).toBe(true)
    }
  })

  it("rejects unknown time zones", () => {
    for (const value of ["", "Paris", "Europe/Atlantis", "GMT+25"]) {
      expect(timeZoneSchema.safeParse(value).success, value).toBe(false)
    }
  })
})

describe("weekdaysSchema", () => {
  it("accepts a non-empty set of weekdays", () => {
    expect(weekdaysSchema.parse([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6])
  })

  it("rejects empty, duplicated or out-of-range days", () => {
    for (const value of [[], [1, 1], [7], [-1], [1.5]]) {
      expect(
        weekdaysSchema.safeParse(value).success,
        JSON.stringify(value)
      ).toBe(false)
    }
  })
})
