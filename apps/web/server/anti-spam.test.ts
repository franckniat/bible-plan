import { describe, expect, it } from "vitest"

import {
  MIN_FILL_TIME_MS,
  getClientIp,
  getIpHashSecret,
  hashIp,
  isHoneypotFilled,
  isSubmittedTooFast,
} from "./anti-spam"

describe("isHoneypotFilled", () => {
  it("flags any value in the hidden field", () => {
    expect(isHoneypotFilled("https://spam.example")).toBe(true)
    expect(isHoneypotFilled("")).toBe(false)
    expect(isHoneypotFilled("   ")).toBe(false)
    expect(isHoneypotFilled(null)).toBe(false)
  })
})

describe("isSubmittedTooFast", () => {
  const now = 1_000_000

  it("flags submissions faster than a human", () => {
    expect(isSubmittedTooFast(String(now - 500), now)).toBe(true)
    expect(isSubmittedTooFast(String(now - MIN_FILL_TIME_MS), now)).toBe(false)
    expect(isSubmittedTooFast(String(now - 60_000), now)).toBe(false)
  })

  it("does not block when the timestamp is missing (JavaScript disabled)", () => {
    expect(isSubmittedTooFast(null, now)).toBe(false)
    expect(isSubmittedTooFast("", now)).toBe(false)
    expect(isSubmittedTooFast("abc", now)).toBe(false)
  })
})

describe("getClientIp", () => {
  it("uses the first forwarded address", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
    expect(getClientIp(headers)).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip, then to nothing", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2"
    )
    expect(getClientIp(new Headers())).toBeUndefined()
  })
})

describe("hashIp", () => {
  it("is stable, keyed and does not contain the address", () => {
    const hash = hashIp("203.0.113.7", "secret")
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(hashIp("203.0.113.7", "secret"))
    expect(hash).not.toBe(hashIp("203.0.113.7", "other-secret"))
    expect(hash).not.toContain("203")
  })
})

describe("getIpHashSecret", () => {
  it("requires a secret in production only", () => {
    expect(getIpHashSecret({ IP_HASH_SECRET: "s3cret" })).toBe("s3cret")
    expect(getIpHashSecret({ NODE_ENV: "development" })).toBeTruthy()
    expect(() => getIpHashSecret({ NODE_ENV: "production" })).toThrow(
      /IP_HASH_SECRET/
    )
  })
})
