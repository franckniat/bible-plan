import { describe, expect, it } from "vitest"

import { parseRememberedComparison } from "./use-remembered-comparison"

describe("parseRememberedComparison", () => {
  it("reads the versions that are stored", () => {
    expect(parseRememberedComparison('["kjv","lsg1910"]')).toEqual([
      "kjv",
      "lsg1910",
    ])
  })

  it("drops what is not a version, and survives bad data", () => {
    expect(parseRememberedComparison('["kjv","nope",3]')).toEqual(["kjv"])
    for (const raw of ["", "not json", "{}", "null", "42"]) {
      expect(parseRememberedComparison(raw)).toEqual([])
    }
  })
})
