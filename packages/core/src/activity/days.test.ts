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
