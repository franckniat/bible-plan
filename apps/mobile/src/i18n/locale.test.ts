import { beforeEach, describe, expect, it, vi } from "vitest"

const phone = vi.hoisted(() => ({ languages: [] as string[] }))

vi.mock("expo-localization", () => ({
  getLocales: () => phone.languages.map((languageCode) => ({ languageCode })),
}))

const { phoneLocale } = await import("./locale")

describe("phoneLocale", () => {
  beforeEach(() => {
    phone.languages = []
  })

  it("follows the phone language", () => {
    phone.languages = ["en"]
    expect(phoneLocale()).toBe("en")
    phone.languages = ["fr"]
    expect(phoneLocale()).toBe("fr")
  })

  it("takes the first preferred language the app speaks", () => {
    phone.languages = ["es", "en", "fr"]
    expect(phoneLocale()).toBe("en")
  })

  it("falls back to French", () => {
    phone.languages = ["es"]
    expect(phoneLocale()).toBe("fr")
    phone.languages = []
    expect(phoneLocale()).toBe("fr")
  })
})
