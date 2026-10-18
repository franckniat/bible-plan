import { describe, expect, it } from "vitest"

import { isAuthorizedCron } from "./cron-auth"

const request = (authorization?: string) =>
  new Request("https://bibleplan.example/api/cron/dispatch", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  })

describe("isAuthorizedCron", () => {
  it("accepts the secret as a bearer token", () => {
    expect(isAuthorizedCron(request("Bearer s3cret"), "s3cret")).toBe(true)
  })

  it.each([
    ["no header", undefined],
    ["a wrong secret", "Bearer nope"],
    ["a prefix of the secret", "Bearer s3cre"],
    ["the secret without Bearer", "s3cret"],
    ["another scheme", "Basic s3cret"],
    ["an empty token", "Bearer "],
  ])("refuses %s", (_, header) => {
    expect(isAuthorizedCron(request(header), "s3cret")).toBe(false)
  })

  it("refuses everything when no secret is configured", () => {
    expect(isAuthorizedCron(request("Bearer "), undefined)).toBe(false)
    expect(isAuthorizedCron(request("Bearer x"), "")).toBe(false)
  })
})
