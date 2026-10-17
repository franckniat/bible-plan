import { describe, expect, it } from "vitest"

import { getProtectedLocale } from "./protected-routes"

const locales = ["fr", "en"]

describe("getProtectedLocale", () => {
  it("detects pages of the signed-in app", () => {
    expect(getProtectedLocale("/fr/today", locales)).toBe("fr")
    expect(getProtectedLocale("/en/plans/42", locales)).toBe("en")
    expect(getProtectedLocale("/fr/settings/reminders", locales)).toBe("fr")
  })

  it("leaves public pages alone", () => {
    for (const pathname of [
      "/fr",
      "/en/privacy",
      "/fr/terms",
      "/fr/sign-in",
      "/fr/todays-verse",
      "/fr/read",
      "/en/read/John.3.16",
      "/plans",
      "/de/plans",
    ]) {
      expect(getProtectedLocale(pathname, locales), pathname).toBeNull()
    }
  })
})
