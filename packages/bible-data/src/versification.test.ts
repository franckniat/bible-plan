import { describe, expect, it } from "vitest"

import { canonVerseOf, versionVersesOf } from "./versification"
import { getBibleVersion } from "./versions"

const lsg = getBibleVersion("lsg1910")
const kjv = getBibleVersion("kjv")

describe("versionVersesOf", () => {
  it("is the same verse when the version numbers like the canon", () => {
    expect(versionVersesOf("John", 3, 16, kjv)).toEqual({ from: 16, to: 16 })
    expect(versionVersesOf("John", 3, 16, lsg)).toEqual({ from: 16, to: 16 })
  })

  it("takes the title of a psalm with its first verse", () => {
    // Psalm 51 has two title verses in the Louis Segond.
    expect(versionVersesOf("Ps", 51, 1, lsg)).toEqual({ from: 1, to: 3 })
    expect(versionVersesOf("Ps", 51, 2, lsg)).toEqual({ from: 4, to: 4 })
  })
})

describe("canonVerseOf", () => {
  it("is the same verse when the version numbers like the canon", () => {
    expect(canonVerseOf("John", 3, 16, lsg)).toBe(16)
  })

  it("gives the canon verse of a verse of a psalm, titles included", () => {
    expect(canonVerseOf("Ps", 51, 1, lsg)).toBe(1) // title
    expect(canonVerseOf("Ps", 51, 3, lsg)).toBe(1)
    expect(canonVerseOf("Ps", 51, 4, lsg)).toBe(2)
  })

  it("reverses versionVersesOf for every verse of a chapter", () => {
    for (const [book, chapter] of [
      ["Ps", 51],
      ["Ps", 3],
      ["John", 3],
      ["Joel", 2],
    ] as const) {
      const count = lsg.verseCounts[book]![chapter - 1]!
      for (let verse = 1; verse <= count; verse++) {
        const canon = canonVerseOf(book, chapter, verse, lsg)
        const { from, to } = versionVersesOf(book, chapter, canon, lsg)
        expect(verse, `${book} ${chapter}:${verse}`).toBeGreaterThanOrEqual(
          from
        )
        expect(verse, `${book} ${chapter}:${verse}`).toBeLessThanOrEqual(to)
      }
    }
  })
})
