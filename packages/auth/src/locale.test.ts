import { describe, expect, it } from "vitest"

import { getRequestLocale } from "./locale"

const request = (headers: Record<string, string>) =>
  new Request("https://example.com/api/auth/sign-up/email", { headers })

describe("getRequestLocale", () => {
  it("prefers the NEXT_LOCALE cookie", () => {
    expect(
      getRequestLocale(
        request({
          cookie: "theme=dark; NEXT_LOCALE=en",
          "accept-language": "fr",
        })
      )
    ).toBe("en")
  })

  it("falls back to the first supported browser language", () => {
    expect(
      getRequestLocale(request({ "accept-language": "de-DE,en-US;q=0.8" }))
    ).toBe("en")
    expect(
      getRequestLocale(request({ "accept-language": "fr-CM,fr;q=0.9" }))
    ).toBe("fr")
  })

  it("defaults to French", () => {
    expect(getRequestLocale()).toBe("fr")
    expect(getRequestLocale(request({ cookie: "NEXT_LOCALE=de" }))).toBe("fr")
    expect(getRequestLocale(request({ "accept-language": "es" }))).toBe("fr")
  })
})
