import { describe, expect, it } from "vitest"

import { books } from "./books"
import { parseReference } from "./parse"
import { bookPassage, chaptersPassage } from "./passage"
import { getChapterCount } from "./verse-counts"
import { adjacentChapter, parsePassageSlug, toPassageSlug } from "./slug"

const passage = (reference: string) => parseReference(reference)![0]!

describe("passage slugs", () => {
  it.each([
    ["Jn 3", "John.3"],
    ["Gn 1-3", "Gen.1-3"],
    ["Jn 3:16", "John.3.16"],
    ["Ps 119:1-88", "Ps.119.1-88"],
    ["Gn 1:1-2:3", "Gen.1.1-2.3"],
    ["1 Jn 4", "1John.4"],
    ["Jude", "Jude.1"],
  ])("writes %s as %s and reads it back", (reference, slug) => {
    expect(toPassageSlug(passage(reference))).toBe(slug)
    expect(parsePassageSlug(slug)).toEqual(passage(reference))
  })

  it("reads back every whole book", () => {
    for (const book of books) {
      const whole = bookPassage(book.id)
      expect(parsePassageSlug(toPassageSlug(whole))).toEqual(whole)
    }
  })

  it.each([
    "",
    "Jn.3",
    "John",
    "John.22",
    "John.3.37",
    "Gen.3-1",
    "Gen.1-2.3",
    "John.3.16-",
    "John.3;rm",
  ])("rejects %j", (slug) => {
    expect(parsePassageSlug(slug)).toBeNull()
  })
})

describe("adjacentChapter", () => {
  it("moves within a book", () => {
    expect(adjacentChapter("John", 3, 1)).toEqual({ book: "John", chapter: 4 })
    expect(adjacentChapter("John", 3, -1)).toEqual({ book: "John", chapter: 2 })
  })

  it("goes over to the next or previous book", () => {
    expect(adjacentChapter("Mal", 4, 1)).toEqual({ book: "Matt", chapter: 1 })
    expect(adjacentChapter("Matt", 1, -1)).toEqual({ book: "Mal", chapter: 4 })
    expect(adjacentChapter("Obad", 1, 1)).toEqual({ book: "Jonah", chapter: 1 })
  })

  it("stops at both ends of the Bible", () => {
    expect(adjacentChapter("Gen", 1, -1)).toBeNull()
    expect(adjacentChapter("Rev", getChapterCount("Rev"), 1)).toBeNull()
  })

  it("matches chapter slugs", () => {
    expect(toPassageSlug(chaptersPassage("Ps", 23))).toBe("Ps.23")
  })
})
