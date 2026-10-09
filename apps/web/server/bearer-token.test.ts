import { describe, expect, it } from "vitest"

import { hasBearerToken } from "./bearer-token"

describe("hasBearerToken", () => {
  it("accepts the expected bearer token", () => {
    expect(hasBearerToken("Bearer s3cret", "s3cret")).toBe(true)
    expect(hasBearerToken("bearer s3cret", "s3cret")).toBe(true)
  })

  it("rejects missing, malformed or wrong tokens", () => {
    for (const header of [
      null,
      "",
      "s3cret",
      "Basic s3cret",
      "Bearer ",
      "Bearer wrong",
    ]) {
      expect(hasBearerToken(header, "s3cret"), String(header)).toBe(false)
    }
  })

  it("rejects everything when no token is configured", () => {
    expect(hasBearerToken("Bearer ", "")).toBe(false)
    expect(hasBearerToken("Bearer anything", "")).toBe(false)
  })
})
