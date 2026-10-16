import { describe, expect, it } from "vitest"

import {
  bookPassage,
  chapterSteps,
  chaptersPassage,
  comparePositions,
  coversWholeChapters,
  isValidPassage,
  type Passage,
} from "./passage"

const passage = (
  book: Passage["book"],
  [startChapter, startVerse]: [number, number],
  [endChapter, endVerse]: [number, number]
): Passage => ({
  book,
  start: { chapter: startChapter, verse: startVerse },
  end: { chapter: endChapter, verse: endVerse },
})

describe("passages", () => {
  it("builds whole chapters and whole books", () => {
    expect(chaptersPassage("Gen", 1, 3)).toEqual(
      passage("Gen", [1, 1], [3, 24])
    )
    expect(chaptersPassage("Ps", 23)).toEqual(passage("Ps", [23, 1], [23, 6]))
    expect(bookPassage("Ruth")).toEqual(passage("Ruth", [1, 1], [4, 22]))
  })

  it("compares verse positions", () => {
    expect(
      comparePositions({ chapter: 1, verse: 30 }, { chapter: 2, verse: 1 })
    ).toBeLessThan(0)
    expect(
      comparePositions({ chapter: 3, verse: 16 }, { chapter: 3, verse: 16 })
    ).toBe(0)
  })

  it.each([
    ["a verse", passage("John", [3, 16], [3, 16]), true],
    ["a range over chapters", passage("Gen", [1, 1], [2, 3]), true],
    ["a missing chapter", passage("John", [22, 1], [22, 2]), false],
    ["a missing verse", passage("John", [3, 37], [3, 37]), false],
    ["verse 0", passage("John", [3, 0], [3, 2]), false],
    ["a reversed range", passage("Gen", [3, 1], [1, 1]), false],
    ["a decimal", passage("Gen", [1.5, 1], [2, 1]), false],
  ])("validates %s", (_, value, valid) => {
    expect(isValidPassage(value)).toBe(valid)
  })

  it("tells whether a passage covers whole chapters", () => {
    expect(coversWholeChapters(chaptersPassage("Gen", 1, 2))).toBe(true)
    expect(coversWholeChapters(passage("Gen", [1, 1], [2, 3]))).toBe(false)
    expect(coversWholeChapters(passage("Gen", [1, 2], [1, 31]))).toBe(false)
  })

  it("cuts a passage into one step per chapter", () => {
    expect(chapterSteps(chaptersPassage("Matt", 1, 3))).toEqual([
      chaptersPassage("Matt", 1),
      chaptersPassage("Matt", 2),
      chaptersPassage("Matt", 3),
    ])
    expect(chapterSteps(passage("Matt", [1, 18], [3, 10]))).toEqual([
      passage("Matt", [1, 18], [1, 25]),
      chaptersPassage("Matt", 2),
      passage("Matt", [3, 1], [3, 10]),
    ])
    expect(chapterSteps(passage("Ps", [119, 1], [119, 88]))).toEqual([
      passage("Ps", [119, 1], [119, 88]),
    ])
  })
})
