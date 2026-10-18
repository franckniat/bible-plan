import { describe, expect, it } from "vitest"

import { highlightColors, highlightRequestSchema } from "./highlight"

const request = {
  book: "John",
  chapter: 3,
  verses: [18, 16, 16],
  color: "YELLOW",
}

describe("highlightRequestSchema", () => {
  it("accepts a request and sorts its verses, each once", () => {
    expect(highlightRequestSchema.parse(request)).toEqual({
      book: "John",
      chapter: 3,
      verses: [16, 18],
      color: "YELLOW",
    })
  })

  it("accepts every color, and null to remove the color", () => {
    for (const color of [...highlightColors, null]) {
      expect(
        highlightRequestSchema.safeParse({ ...request, color }).success
      ).toBe(true)
    }
  })

  it.each([
    ["an unknown book", { book: "Nope" }],
    ["a chapter that does not exist", { chapter: 22 }],
    ["chapter 0", { chapter: 0 }],
    ["a verse beyond the chapter", { verses: [16, 37] }],
    ["verse 0", { verses: [0] }],
    ["no verse", { verses: [] }],
    ["a fractional verse", { verses: [1.5] }],
    ["an unknown color", { color: "RED" }],
    ["a missing color", { color: undefined }],
  ])("rejects %s", (_, override) => {
    expect(
      highlightRequestSchema.safeParse({ ...request, ...override }).success
    ).toBe(false)
  })
})
