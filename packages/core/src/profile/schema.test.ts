import { describe, expect, it } from "vitest"

import { readingSpeeds } from "./reading-speed"
import { maxNameLength, profileSettingsSchema } from "./schema"

const valid = {
  name: "  Manuel ",
  locale: "fr",
  timezone: "Africa/Douala",
  readingWpm: "180",
}

describe("profileSettingsSchema", () => {
  it("trims the name and converts the reading speed", () => {
    expect(profileSettingsSchema.parse(valid)).toEqual({
      name: "Manuel",
      locale: "fr",
      timezone: "Africa/Douala",
      readingWpm: 180,
    })
  })

  it("accepts every reading speed preset", () => {
    for (const wpm of Object.values(readingSpeeds)) {
      expect(
        profileSettingsSchema.safeParse({ ...valid, readingWpm: wpm }).success
      ).toBe(true)
    }
  })

  it.each([
    ["an empty name", { name: "   " }, "required"],
    ["a name too long", { name: "a".repeat(maxNameLength + 1) }, "too_long"],
  ])("rejects %s", (_, override, code) => {
    const result = profileSettingsSchema.safeParse({ ...valid, ...override })
    expect(result.error?.issues[0]?.message).toBe(code)
  })

  it.each([
    ["an unsupported locale", { locale: "de" }],
    ["an unknown time zone", { timezone: "Mars/Olympus" }],
    ["a reading speed too slow", { readingWpm: "10" }],
    ["a reading speed too fast", { readingWpm: "1000" }],
    ["a decimal reading speed", { readingWpm: "180.5" }],
    ["a missing reading speed", { readingWpm: "" }],
  ])("rejects %s", (_, override) => {
    expect(
      profileSettingsSchema.safeParse({ ...valid, ...override }).success
    ).toBe(false)
  })
})
