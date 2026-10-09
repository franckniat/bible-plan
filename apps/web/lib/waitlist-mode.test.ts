import { describe, expect, it } from "vitest"

import { getWaitlistRedirect, isWaitlistModeEnabled } from "./waitlist-mode"

const locales = ["fr", "en"]

describe("isWaitlistModeEnabled", () => {
  it("is enabled only by the exact value true", () => {
    expect(isWaitlistModeEnabled("true")).toBe(true)
    for (const value of [undefined, "", "false", "1", "TRUE"]) {
      expect(isWaitlistModeEnabled(value), String(value)).toBe(false)
    }
  })
})

describe("getWaitlistRedirect", () => {
  it("lets the landing and allowed pages through", () => {
    for (const pathname of [
      "/fr",
      "/fr/",
      "/en",
      "/fr/privacy",
      "/en/privacy/",
      "/fr/terms",
      "/fr/opengraph-image",
      "/en/twitter-image-1a2b3c",
    ]) {
      expect(getWaitlistRedirect(pathname, locales), pathname).toBeNull()
    }
  })

  it("redirects any other localized page to the landing", () => {
    expect(getWaitlistRedirect("/fr/plans", locales)).toBe("/fr")
    expect(getWaitlistRedirect("/en/plans/123", locales)).toBe("/en")
    expect(getWaitlistRedirect("/fr/sign-in", locales)).toBe("/fr")
    expect(getWaitlistRedirect("/fr/privacy/extra", locales)).toBe("/fr")
  })

  it("leaves unprefixed paths to the i18n proxy", () => {
    for (const pathname of ["/", "/plans", "/de/plans"]) {
      expect(getWaitlistRedirect(pathname, locales), pathname).toBeNull()
    }
  })
})
