import { describe, expect, it } from "vitest"

import { reminderInputSchema } from "./schema"

const base = {
  localTime: "06:30",
  timeZone: "Africa/Douala",
  weekdays: [1, 2, 3, 4, 5],
  channels: ["PUSH"],
}

describe("reminderInputSchema", () => {
  it("keeps the reminders as they were by default", () => {
    expect(
      reminderInputSchema.parse({ ...base, kind: "PRAYER" })
    ).toMatchObject({
      leadMinutes: 0,
      durationMinutes: null,
      focusMode: "NOTIFY",
    })
  })

  it("makes a prayer reminder a prayer time", () => {
    expect(
      reminderInputSchema.parse({
        ...base,
        kind: "PRAYER",
        leadMinutes: 5,
        durationMinutes: 15,
        focusMode: "STRICT",
      })
    ).toMatchObject({
      leadMinutes: 5,
      durationMinutes: 15,
      focusMode: "STRICT",
    })
  })

  it("drops the prayer time settings of other reminders", () => {
    expect(
      reminderInputSchema.parse({
        ...base,
        kind: "READING",
        leadMinutes: 5,
        durationMinutes: 15,
        focusMode: "SOFT",
      })
    ).toMatchObject({
      leadMinutes: 0,
      durationMinutes: null,
      focusMode: "NOTIFY",
    })
  })

  it("rejects durations and warnings out of bounds", () => {
    for (const change of [
      { durationMinutes: 2 },
      { durationMinutes: 240 },
      { leadMinutes: -5 },
      { leadMinutes: 90 },
      { focusMode: "LOCKED" },
    ]) {
      expect(
        reminderInputSchema.safeParse({ ...base, kind: "PRAYER", ...change })
          .success
      ).toBe(false)
    }
  })
})
