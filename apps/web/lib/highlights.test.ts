import { describe, expect, it } from "vitest"

import { getBibleVersion } from "@workspace/bible-data"

import {
  canonVersesOf,
  colorsInVersion,
  highlightKey,
  isHighlightColor,
  sharedColor,
} from "./highlights"

const lsg = getBibleVersion("lsg1910")

describe("colorsInVersion", () => {
  it("colors the verses of a chapter that are highlighted", () => {
    const colors = {
      [highlightKey("John", 3, 16)]: "YELLOW" as const,
      [highlightKey("John", 3, 18)]: "BLUE" as const,
      [highlightKey("John", 4, 1)]: "PINK" as const,
    }
    expect(colorsInVersion(colors, "John", 3, [15, 16, 17, 18], lsg)).toEqual({
      16: "YELLOW",
      18: "BLUE",
    })
  })

  it("colors the title of a psalm with its first verse", () => {
    // Psalm 51 has two title verses in the Louis Segond: 1-3 are canon verse 1.
    const colors = { [highlightKey("Ps", 51, 1)]: "GREEN" as const }
    expect(colorsInVersion(colors, "Ps", 51, [1, 2, 3, 4], lsg)).toEqual({
      1: "GREEN",
      2: "GREEN",
      3: "GREEN",
    })
  })
})

describe("canonVersesOf", () => {
  it("gives each verse of the canon once", () => {
    expect(canonVersesOf("Ps", 51, [1, 2, 3, 4], lsg)).toEqual([1, 2])
    expect(canonVersesOf("John", 3, [18, 16], lsg)).toEqual([16, 18])
  })
})

describe("sharedColor", () => {
  const colors = { 1: "YELLOW", 2: "YELLOW", 3: "BLUE" } as const
  it("is the color all the verses have", () => {
    expect(sharedColor(colors, [1, 2])).toBe("YELLOW")
  })
  it("is null when they differ or one has none", () => {
    expect(sharedColor(colors, [1, 3])).toBeNull()
    expect(sharedColor(colors, [1, 4])).toBeNull()
  })
})

describe("isHighlightColor", () => {
  it("knows the colors", () => {
    expect(isHighlightColor("PINK")).toBe(true)
    expect(isHighlightColor("RED")).toBe(false)
    expect(isHighlightColor(undefined)).toBe(false)
  })
})
