import { describe, expect, it } from "vitest"

import {
  countryCodeSchema,
  countryCodes,
  getCountries,
  getCountryName,
} from "./countries"
import { locales } from "./schemas/common"

describe("countryCodes", () => {
  it("lists the 249 ISO 3166-1 alpha-2 codes once", () => {
    expect(countryCodes).toHaveLength(249)
    expect(new Set(countryCodes).size).toBe(249)
    for (const code of countryCodes) expect(code).toMatch(/^[A-Z]{2}$/)
  })

  it("validates country codes", () => {
    expect(countryCodeSchema.safeParse("CM").success).toBe(true)
    for (const value of ["cm", "EU", "XX", "CMR", ""]) {
      expect(countryCodeSchema.safeParse(value).success, value).toBe(false)
    }
  })
})

describe("getCountryName", () => {
  it("translates country names", () => {
    expect(getCountryName("CM", "fr")).toBe("Cameroun")
    expect(getCountryName("CM", "en")).toBe("Cameroon")
    expect(getCountryName("CI", "fr")).toBe("Côte d’Ivoire")
  })

  it.each(locales)("has a real name for every country in %s", (locale) => {
    for (const code of countryCodes) {
      expect(getCountryName(code, locale), code).not.toBe(code)
    }
  })
})

describe("getCountries", () => {
  it("sorts countries alphabetically for the locale", () => {
    const names = getCountries("fr").map((country) => country.name)
    expect(names).toHaveLength(249)
    // Accented names are sorted with their base letter.
    expect(names.indexOf("Égypte")).toBeLessThan(names.indexOf("Équateur"))
    expect(names.indexOf("Égypte")).toBeGreaterThan(names.indexOf("Danemark"))
    expect(names.indexOf("Égypte")).toBeLessThan(names.indexOf("Espagne"))
  })
})
