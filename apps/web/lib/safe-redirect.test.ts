import { describe, expect, it } from "vitest"

import { getSafeRedirect } from "./safe-redirect"

describe("getSafeRedirect", () => {
  it("keeps relative paths", () => {
    expect(getSafeRedirect("/fr/plans/42?tab=days", "/fr/today")).toBe(
      "/fr/plans/42?tab=days"
    )
  })

  it("rejects external or malformed targets", () => {
    for (const value of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "",
      undefined,
      ["/fr"],
    ]) {
      expect(getSafeRedirect(value, "/fr/today"), String(value)).toBe(
        "/fr/today"
      )
    }
  })
})
