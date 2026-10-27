import { describe, expect, it } from "vitest"

import {
  formatSelectionParam,
  formatVerseRanges,
  parseSelectionParam,
  selectionHref,
  selectionReference,
  toggleVerse,
  verseRanges,
} from "./selection"

describe("toggleVerse", () => {
  it("adds verses, next to each other or not, keeping them sorted", () => {
    let selection = toggleVerse(null, 3, 16)
    selection = toggleVerse(selection, 3, 20)
    selection = toggleVerse(selection, 3, 18)
    expect(selection).toEqual({ chapter: 3, verses: [16, 18, 20] })
  })

  it("removes a verse without losing the others", () => {
    const selection = { chapter: 3, verses: [16, 18, 20] }
    expect(toggleVerse(selection, 3, 18)).toEqual({
      chapter: 3,
      verses: [16, 20],
    })
  })

  it("clears the selection when the last verse is removed", () => {
    expect(toggleVerse({ chapter: 3, verses: [16] }, 3, 16)).toBeNull()
  })

  it("starts a new selection in another chapter", () => {
    expect(toggleVerse({ chapter: 3, verses: [16, 17] }, 4, 2)).toEqual({
      chapter: 4,
      verses: [2],
    })
  })
})

describe("verseRanges", () => {
  it("groups consecutive verses", () => {
    expect(verseRanges([20, 16, 18, 19, 18])).toEqual([
      [16, 16],
      [18, 20],
    ])
    expect(verseRanges([])).toEqual([])
  })

  it("is written the way a reference is", () => {
    expect(formatVerseRanges([16, 18, 19, 20])).toBe("16, 18–20")
    expect(formatVerseRanges([5])).toBe("5")
  })
})

describe("selectionReference", () => {
  it("writes the book, the chapter and the verses", () => {
    expect(
      selectionReference("John", { chapter: 3, verses: [16, 18, 19, 20] }, "fr")
    ).toBe("Jean 3:16, 18–20")
    expect(selectionReference("John", { chapter: 3, verses: [16] }, "en")).toBe(
      "John 3:16"
    )
    expect(selectionReference("Ps", { chapter: 23, verses: [1] }, "fr")).toBe(
      "Psaume 23:1"
    )
  })

  it("has no chapter number in a book of one chapter", () => {
    expect(
      selectionReference("Jude", { chapter: 1, verses: [5, 7, 8, 9] }, "fr")
    ).toBe("Jude 5, 7–9")
  })
})

describe("selection parameter", () => {
  it("round-trips a selection", () => {
    const verses = [1, 3, 4, 5, 9]
    expect(formatSelectionParam(verses)).toBe("1,3-5,9")
    expect(parseSelectionParam("1,3-5,9")).toEqual(verses)
  })

  it.each([
    undefined,
    ["1"],
    "",
    "abc",
    "0",
    "5-3",
    "1,,2",
    "1-2-3",
    "1;2",
    "1-9999",
    "1-150,1-150",
  ])("reads %j as no selection", (value) => {
    expect(parseSelectionParam(value)).toEqual([])
  })
})

describe("selectionHref", () => {
  it("links a run of verses by its passage", () => {
    expect(
      selectionHref("John", "kjv", { chapter: 3, verses: [16, 17, 18] })
    ).toBe("/read/John.3.16-18?v=kjv")
    expect(selectionHref("John", "lsg1910", { chapter: 3, verses: [16] })).toBe(
      "/read/John.3.16?v=lsg1910"
    )
  })

  it("opens the chapter with the verses when they are apart", () => {
    expect(
      selectionHref("John", "kjv", { chapter: 3, verses: [16, 18, 19] })
    ).toBe("/read/John.3?v=kjv&sel=16,18-19")
  })

  it("opens the chapter with the verses when the version numbers it differently", () => {
    // Psalm 51 has title verses in the Louis Segond.
    expect(
      selectionHref("Ps", "lsg1910", { chapter: 51, verses: [3, 4] })
    ).toBe("/read/Ps.51?v=lsg1910&sel=3-4")
  })
})
