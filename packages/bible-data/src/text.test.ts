import { describe, expect, it } from "vitest"

import { displayVerse } from "./text"

describe("displayVerse", () => {
  it("shows KJV paragraphs and added words", () => {
    expect(
      displayVerse("kjv", "¶ Now a certain [man] was sick, [named] Lazarus.")
    ).toEqual({
      paragraph: true,
      segments: [
        { text: "Now a certain ", italic: false },
        { text: "man", italic: true },
        { text: " was sick, ", italic: false },
        { text: "named", italic: true },
        { text: " Lazarus.", italic: false },
      ],
    })
  })

  it("keeps the brackets of the Louis Segond", () => {
    const text = "[Lorsqu’il eut dit cela, les Juifs s’en allèrent.]"
    expect(displayVerse("lsg1910", text)).toEqual({
      paragraph: false,
      segments: [{ text, italic: false }],
    })
  })
})
