import { describe, expect, it } from "vitest"

import { chapterPath, chapterSchema } from "./chapter"

describe("chapter format", () => {
  it("accepts a chapter file", () => {
    const chapter = {
      version: "kjv",
      book: "John",
      chapter: 11,
      verses: [[35, "Jesus wept."]],
    }
    expect(chapterSchema.parse(chapter)).toEqual(chapter)
  })

  it.each([
    ["an unknown book", { book: "Jn" }],
    ["an empty chapter", { verses: [] }],
    ["an empty verse", { verses: [[1, ""]] }],
    ["verse 0", { verses: [[0, "Text"]] }],
  ])("rejects %s", (_, override) => {
    const chapter = {
      version: "kjv",
      book: "John",
      chapter: 1,
      verses: [[1, "In the beginning was the Word"]],
      ...override,
    }
    expect(chapterSchema.safeParse(chapter).success).toBe(false)
  })

  it("places chapters under version and OSIS book", () => {
    expect(chapterPath("lsg1910", "Gen", 1)).toBe("lsg1910/Gen/1.json")
  })
})
