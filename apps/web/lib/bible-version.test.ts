import { describe, expect, it } from "vitest"

import { pickBibleVersion } from "./bible-version"

describe("pickBibleVersion", () => {
  it("takes the first valid choice", () => {
    expect(pickBibleVersion(["kjv", "lsg1910"], "fr")).toBe("kjv")
    expect(pickBibleVersion([undefined, "nope", "lsg1910"], "en")).toBe(
      "lsg1910"
    )
  })

  it("falls back to the version of the language", () => {
    expect(pickBibleVersion([], "fr")).toBe("lsg1910")
    expect(pickBibleVersion([undefined, "nope"], "en")).toBe("kjv")
  })
})
