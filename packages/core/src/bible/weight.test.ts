import { describe, expect, it } from "vitest"

import { bookIds } from "./books"
import { parseReference } from "./parse"
import { bookPassage } from "./passage"
import { getBookVerseCount } from "./verse-counts"
import {
  countPassageVerses,
  countVerses,
  estimateReadingMinutes,
  versesForMinutes,
} from "./weight"

const verses = (input: string) => countVerses(parseReference(input)!)

describe("verse counting", () => {
  it.each([
    ["Jn 3:16", 1],
    ["Ps 119:1-88", 88],
    ["Gn 1-3", 31 + 25 + 24],
    ["Gn 1:30-2:2", 2 + 2],
    ["Gn 1:31-3:1", 1 + 25 + 1],
    ["Mt 5-7; Lc 6", 48 + 34 + 29 + 49],
  ])("counts %s", (input, expected) => {
    expect(verses(input)).toBe(expected)
  })

  it("counts whole books", () => {
    for (const id of bookIds) {
      expect(countPassageVerses(bookPassage(id))).toBe(getBookVerseCount(id))
    }
  })
})

describe("reading time", () => {
  it("estimates minutes from the reading speed", () => {
    // 72 verses × 25 words = 1,800 words: 10 minutes at 180 words/min.
    expect(estimateReadingMinutes(72, 180)).toBe(10)
    expect(estimateReadingMinutes(72, 240)).toBe(7.5)
    expect(estimateReadingMinutes(0, 180)).toBe(0)
  })

  it("gives the verses that fit in a duration", () => {
    expect(versesForMinutes(10, 180)).toBe(72)
    expect(versesForMinutes(15, 130)).toBe(78)
    expect(versesForMinutes(0, 180)).toBe(0)
  })

  it("rejects an invalid reading speed", () => {
    expect(() => estimateReadingMinutes(10, 0)).toThrow(RangeError)
    expect(() => versesForMinutes(10, -5)).toThrow(RangeError)
    expect(() => versesForMinutes(10, Number.NaN)).toThrow(RangeError)
  })
})
