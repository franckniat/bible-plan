import { describe, expect, it } from "vitest"

import { bookIds } from "@workspace/core"

import { usfmCode } from "./youversion"

describe("usfmCode", () => {
  it("has a USFM code for every book", () => {
    const codes = bookIds.map(usfmCode)
    expect(new Set(codes).size).toBe(66)
    for (const code of codes) expect(code).toMatch(/^[1-3A-Z][A-Z0-9]{2}$/)
  })
})
