import { describe, expect, it } from "vitest"

import { formatPassages } from "../bible/format"
import { parseReference } from "../bible/parse"
import { mergeUnits, toUnits } from "./units"

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
