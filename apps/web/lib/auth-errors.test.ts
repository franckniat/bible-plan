import { describe, expect, it } from "vitest"

import { getAuthErrorKey } from "./auth-errors"

describe("getAuthErrorKey", () => {
  it("maps better-auth error codes to messages", () => {
    expect(getAuthErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "invalidCredentials"
    )
    expect(
      getAuthErrorKey({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })
    ).toBe("userExists")
    expect(getAuthErrorKey({ code: "TOKEN_EXPIRED" })).toBe("invalidToken")
  })

  it("detects rate limiting and falls back to a generic message", () => {
    expect(getAuthErrorKey({ status: 429, code: "TOO_MANY" })).toBe(
      "tooManyRequests"
    )
    expect(getAuthErrorKey({ code: "SOMETHING_NEW" })).toBe("unexpected")
    expect(getAuthErrorKey(null)).toBe("unexpected")
  })
})
