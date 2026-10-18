import { describe, expect, it } from "vitest"

import {
  defaultComparison,
  maxComparedVersions,
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
