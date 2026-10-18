import { describe, expect, it } from "vitest"

import {
  defaultComparison,
  formatCompareParam,
  maxComparedVersions,
  parallelRows,
  parseCompareParam,
  toggleComparedVersion,
  versesInVersion,
} from "./compare"

describe("defaultComparison", () => {
  it("puts the version on screen first, then another one", () => {
    expect(defaultComparison("lsg1910")).toEqual(["lsg1910", "kjv"])
    expect(defaultComparison("kjv")).toEqual(["kjv", "lsg1910"])
  })

  it("takes what was compared last time, ignoring what is unknown", () => {
    expect(defaultComparison("kjv", ["nope", "lsg1910", "kjv"])).toEqual([
      "kjv",
      "lsg1910",
    ])
  })
})

describe("toggleComparedVersion", () => {
  it("adds a version, then removes it", () => {
    expect(toggleComparedVersion(["kjv"], "lsg1910")).toEqual([
      "kjv",
      "lsg1910",
    ])
    expect(toggleComparedVersion(["kjv", "lsg1910"], "kjv")).toEqual([
      "lsg1910",
    ])
  })

  it("always keeps at least one version", () => {
    expect(toggleComparedVersion(["kjv"], "kjv")).toEqual(["kjv"])
  })

  it("does not go past the maximum", () => {
    const full = Array.from(
      { length: maxComparedVersions },
      () => "kjv"
    ) as never
    expect(toggleComparedVersion(full, "lsg1910")).toHaveLength(
      maxComparedVersions
    )
  })
})

describe("versesInVersion", () => {
  it("is the same verses where the numbering is the same", () => {
    expect(versesInVersion("John", 3, [16, 18], "kjv")).toEqual([16, 18])
    expect(versesInVersion("John", 3, [16, 18], "lsg1910")).toEqual([16, 18])
  })

  it("brings the title of a psalm with its first verse", () => {
    expect(versesInVersion("Ps", 51, [1], "lsg1910")).toEqual([1, 2, 3])
    expect(versesInVersion("Ps", 51, [1], "kjv")).toEqual([1])
  })
})

describe("compare parameter", () => {
  it("reads the other versions, without the main one, repeats or unknown ids", () => {
    expect(parseCompareParam("kjv", "lsg1910")).toEqual(["kjv"])
    expect(parseCompareParam("kjv,kjv,lsg1910,nope", "lsg1910")).toEqual([
      "kjv",
    ])
    expect(parseCompareParam("lsg1910", "lsg1910")).toEqual([])
    expect(parseCompareParam(undefined, "kjv")).toEqual([])
    expect(parseCompareParam(["kjv"], "lsg1910")).toEqual([])
  })

  it("is written as a list", () => {
    expect(formatCompareParam(["kjv", "lsg1910"])).toBe("kjv,lsg1910")
    expect(formatCompareParam([])).toBe("")
  })
})

describe("parallelRows", () => {
  const text = (verses: Record<number, string>): [number, string][] =>
    Object.entries(verses).map(([n, t]) => [Number(n), t])

  it("puts the same verse of each version in a row", () => {
    const rows = parallelRows("John", 3, ["kjv", "lsg1910"], {
      kjv: text({ 15: "a", 16: "For God", 17: "c" }),
      lsg1910: text({ 15: "x", 16: "Car Dieu", 17: "z" }),
    })
    expect(rows).toHaveLength(36)
    expect(rows[15]).toEqual({
      canon: 16,
      cells: [[[16, "For God"]], [[16, "Car Dieu"]]],
    })
  })

  it("keeps a psalm aligned when the titles are verses of their own", () => {
    const rows = parallelRows("Ps", 51, ["kjv", "lsg1910"], {
      kjv: text({ 1: "Title and verse 1", 2: "Verse 2" }),
      lsg1910: text({ 1: "Titre", 2: "Nathan", 3: "Verset 1", 4: "Verset 2" }),
    })
    expect(rows[0]).toEqual({
      canon: 1,
      cells: [
        [[1, "Title and verse 1"]],
        [
          [1, "Titre"],
          [2, "Nathan"],
          [3, "Verset 1"],
        ],
      ],
    })
    expect(rows[1]!.cells).toEqual([[[2, "Verse 2"]], [[4, "Verset 2"]]])
  })

  it("shows a verse of a version once", () => {
    const rows = parallelRows("Ps", 51, ["lsg1910"], {
      lsg1910: text({ 1: "Titre", 2: "Nathan", 3: "Verset 1" }),
    })
    const all = rows.flatMap((row) => row.cells[0]!.map(([n]) => n))
    expect(all).toEqual([...new Set(all)])
  })
})
