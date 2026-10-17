import { describe, expect, it } from "vitest"

import { shareSlug, toggleVerse } from "./verse-selection"

describe("toggleVerse", () => {
  it("selects a verse, extends to a range, then starts over", () => {
    const one = toggleVerse(null, 3, 16)
    expect(one).toEqual({ chapter: 3, from: 16, to: 16 })
    const range = toggleVerse(one, 3, 18)
    expect(range).toEqual({ chapter: 3, from: 16, to: 18 })
    expect(toggleVerse(range, 3, 20)).toEqual({ chapter: 3, from: 20, to: 20 })
  })

  it("clears the selection when the only verse is tapped again", () => {
    expect(toggleVerse({ chapter: 3, from: 16, to: 16 }, 3, 16)).toBeNull()
  })

  it("orders a range chosen backwards", () => {
    expect(toggleVerse({ chapter: 3, from: 18, to: 18 }, 3, 16)).toEqual({
      chapter: 3,
      from: 16,
      to: 18,
    })
  })
})

describe("shareSlug", () => {
  it("links the verses when the version numbers the chapter as the canon", () => {
    expect(shareSlug("John", "kjv", { chapter: 3, from: 16, to: 18 })).toBe(
      "John.3.16-18"
    )
    expect(shareSlug("John", "lsg1910", { chapter: 3, from: 16, to: 16 })).toBe(
      "John.3.16"
    )
  })

  it("links the whole chapter when the numbering differs", () => {
    // Psalm 51 has title verses in the Louis Segond.
    expect(shareSlug("Ps", "lsg1910", { chapter: 51, from: 3, to: 4 })).toBe(
      "Ps.51"
    )
  })
})
