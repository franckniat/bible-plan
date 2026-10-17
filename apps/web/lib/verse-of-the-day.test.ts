import { describe, expect, it } from "vitest"

import { toPassageSlug, type IsoDate } from "@workspace/core"

import verses from "@/content/verses-of-the-day.json"

import { findVerseOfTheDay } from "./verse-of-the-day"

const calendar = {
  "2026-10-17": "Philippiens 4:19",
  "2026-10-20": "Jn 3:16",
}
const slug = (date: string) => {
  const passage = findVerseOfTheDay(date as IsoDate, "fr", calendar)
  return passage && toPassageSlug(passage)
}

describe("findVerseOfTheDay", () => {
  it("takes the verse chosen for the day", () => {
    expect(slug("2026-10-17")).toBe("Phil.4.19")
    expect(slug("2026-10-20")).toBe("John.3.16")
  })

  it("keeps the last verse chosen on days without one", () => {
    expect(slug("2026-10-18")).toBe("Phil.4.19")
    expect(slug("2027-01-01")).toBe("John.3.16")
  })

  it("has no verse before the first one", () => {
    expect(slug("2026-10-16")).toBeNull()
  })
})

describe("content/verses-of-the-day.json", () => {
  it.each(Object.entries(verses))(
    "%s: %s is a valid reference",
    (date, ref) => {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(findVerseOfTheDay(date as IsoDate, "fr")).not.toBeNull()
      expect(ref).toBeTruthy()
    }
  )
})
