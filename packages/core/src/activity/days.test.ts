import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { computeActivityDays, type ActivityEvent } from "./days"

const at = (iso: string) => new Date(iso)

describe("computeActivityDays", () => {
  it("adds up each kind of event per day", () => {
    const events: ActivityEvent[] = [
      { type: "reading", at: at("2027-01-01T08:00:00Z") },
      { type: "reading", at: at("2027-01-01T20:00:00Z") },
      { type: "prayer", at: at("2027-01-01T21:00:00Z") },
      {
        type: "session",
        kind: "MEDITATION",
        seconds: 600,
        at: at("2027-01-03T07:00:00Z"),
      },
      {
        type: "session",
        kind: "PRAYER",
        seconds: 900,
        at: at("2027-01-03T22:00:00Z"),
      },
    ]
    expect(computeActivityDays(events, "UTC")).toEqual([
      {
        day: "2027-01-01",
        readings: 2,
        prayers: 1,
        meditationSeconds: 0,
        prayerSeconds: 0,
      },
      {
        day: "2027-01-03",
        readings: 0,
        prayers: 1,
        meditationSeconds: 600,
        prayerSeconds: 900,
      },
    ])
  })

  it("uses the days of the person's time zone", () => {
    // 23:30 in Douala on January 1 is already January 2 in Tokyo.
    const events: ActivityEvent[] = [
      { type: "reading", at: at("2027-01-01T22:30:00Z") },
    ]
    expect(computeActivityDays(events, "Africa/Douala")[0]!.day).toBe(
      "2027-01-01"
    )
    expect(computeActivityDays(events, "Asia/Tokyo")[0]!.day).toBe("2027-01-02")
    expect(computeActivityDays(events, "America/Los_Angeles")[0]!.day).toBe(
      "2027-01-01"
    )
    // An unknown zone falls back to UTC.
    expect(computeActivityDays(events, "Nowhere/City")[0]!.day).toBe(
      "2027-01-01"
    )
  })

  it("follows daylight saving time", () => {
    // New York moves from UTC-4 to UTC-5 on November 7, 2027 at 2:00.
    const events: ActivityEvent[] = [
      // 23:30 on November 6 (UTC-4) and 23:30 on November 7 (UTC-5).
      { type: "reading", at: at("2027-11-07T03:30:00Z") },
      { type: "reading", at: at("2027-11-08T04:30:00Z") },
    ]
    expect(
      computeActivityDays(events, "America/New_York").map(({ day }) => day)
    ).toEqual(["2027-11-06", "2027-11-07"])
  })

  it("handles the zones furthest from UTC", () => {
    // The same instant is a different day at UTC+14 and UTC-11.
    const events: ActivityEvent[] = [
      { type: "prayer", at: at("2027-03-01T11:00:00Z") },
    ]
    expect(computeActivityDays(events, "Pacific/Kiritimati")[0]!.day).toBe(
      "2027-03-02"
    )
    expect(computeActivityDays(events, "Pacific/Pago_Pago")[0]!.day).toBe(
      "2027-03-01"
    )
  })

  it("counts a session on the day it ended, even across midnight", () => {
    // Saved at 00:10 in Douala after a 30-minute time of prayer.
    const events: ActivityEvent[] = [
      {
        type: "session",
        kind: "PRAYER",
        seconds: 1800,
        at: at("2027-01-01T23:10:00Z"),
      },
    ]
    expect(computeActivityDays(events, "Africa/Douala")).toEqual([
      {
        day: "2027-01-02",
        readings: 0,
        prayers: 1,
        meditationSeconds: 0,
        prayerSeconds: 1800,
      },
    ])
  })

  it("leaves out days with nothing done", () => {
    expect(
      computeActivityDays(
        [
          {
            type: "session",
            kind: "MEDITATION",
            seconds: 0,
            at: at("2027-01-01T08:00:00Z"),
          },
        ],
        "UTC"
      )
    ).toEqual([])
  })

  it("does not depend on the order of the events", () => {
    const event = fc.oneof(
      fc.record({
        type: fc.constant("reading" as const),
        at: fc.date({
          min: new Date("2026-01-01"),
          max: new Date("2028-01-01"),
          noInvalidDate: true,
        }),
      }),
      fc.record({
        type: fc.constant("session" as const),
        kind: fc.constantFrom("MEDITATION" as const, "PRAYER" as const),
        seconds: fc.integer({ min: 0, max: 7200 }),
        at: fc.date({
          min: new Date("2026-01-01"),
          max: new Date("2028-01-01"),
          noInvalidDate: true,
        }),
      })
    )
    fc.assert(
      fc.property(
        fc.array(event, { maxLength: 50 }),
        fc.constantFrom("UTC", "Africa/Douala", "Pacific/Kiritimati"),
        (events, zone) => {
          expect(computeActivityDays([...events].reverse(), zone)).toEqual(
            computeActivityDays(events, zone)
          )
        }
      )
    )
  })
})
