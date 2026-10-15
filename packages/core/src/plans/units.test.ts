import { describe, expect, it } from "vitest"

import { formatPassages } from "../bible/format"
import { parseReference } from "../bible/parse"
import { mergeUnits, splitLongUnits, toUnits } from "./units"

const units = (reference: string) => toUnits(parseReference(reference)!)

describe("reading units", () => {
  it("cuts passages into chapters", () => {
    expect(units("Gn 1-3").map((unit) => unit.verses)).toEqual([31, 25, 24])
  })

  it("keeps partial chapters", () => {
    expect(units("Gn 1:30-3:2")).toEqual([
      { book: "Gen", chapter: 1, startVerse: 30, endVerse: 31, verses: 2 },
      { book: "Gen", chapter: 2, startVerse: 1, endVerse: 25, verses: 25 },
      { book: "Gen", chapter: 3, startVerse: 1, endVerse: 2, verses: 2 },
    ])
  })

  it.each([
    ["Gn 1-3", "Genèse 1–3"],
    ["Gn 1:30-3:2", "Genèse 1:30–3:2"],
    ["Gn 50; Ex 1", "Genèse 50; Exode 1"],
    ["Ps 23; Jn 3", "Psaume 23; Jean 3"],
    ["Gn 1:1-10; Gn 1:11-20", "Genèse 1:1–20"],
    ["Gn 1:1-10; Gn 1:12-20", "Genèse 1:1–10; Genèse 1:12–20"],
    ["Gn 1:1-30; Gn 2", "Genèse 1:1–30; Genèse 2"],
  ])("merges %s back into %s", (reference, expected) => {
    expect(formatPassages(mergeUnits(units(reference)), "fr")).toBe(expected)
  })
})

describe("splitLongUnits", () => {
  const ranges = (
    reference: string,
    options: Parameters<typeof splitLongUnits>[1]
  ) =>
    formatPassages(
      splitLongUnits(units(reference), options).flatMap((unit) =>
        mergeUnits([unit])
      ),
      "fr",
      { style: "short" }
    )

  it("cuts units longer than the limit into nearly equal ranges", () => {
    expect(ranges("Ps 119", { maxVerses: 100 })).toBe(
      "Ps 119:1–88; Ps 119:89–176"
    )
    expect(ranges("Ps 119", { maxVerses: 60 })).toBe(
      "Ps 119:1–59; Ps 119:60–118; Ps 119:119–176"
    )
    expect(ranges("Gn 1:2-11", { maxVerses: 3 })).toBe(
      "Gn 1:2–4; Gn 1:5–7; Gn 1:8–9; Gn 1:10–11"
    )
  })

  it("keeps short units", () => {
    expect(ranges("Ps 117-118", { maxVerses: 50 })).toBe("Ps 117; Ps 118")
  })

  it("cuts the longest units until there are enough", () => {
    expect(ranges("Ps 117-118", { minUnits: 3 })).toBe(
      "Ps 117; Ps 118:1–15; Ps 118:16–29"
    )
    // Cut into even pieces rather than halves of halves.
    expect(
      splitLongUnits(units("Ps 119"), { maxVerses: 51, minUnits: 7 }).map(
        (unit) => unit.verses
      )
    ).toEqual([26, 25, 25, 25, 25, 25, 25])
    // Only as many units as verses.
    expect(splitLongUnits(units("Ps 117"), { minUnits: 5 })).toHaveLength(2)
  })
})
