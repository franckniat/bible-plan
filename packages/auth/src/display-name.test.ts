import { describe, expect, it } from "vitest"

import { nameFromEmail, nameOrFromEmail } from "./display-name"

describe("nameFromEmail", () => {
  it("reads the part before the @ as words", () => {
    expect(nameFromEmail("djaklalaisso@gmail.com", "fr")).toBe("Djaklalaisso")
    expect(nameFromEmail("jean.dupont@example.com", "fr")).toBe("Jean Dupont")
    expect(nameFromEmail("marie_claire-n@example.com", "en")).toBe(
      "Marie Claire N"
    )
  })

  it("ignores a +tag, and the case of the address", () => {
    expect(nameFromEmail("Jean.DUPONT+bible@example.com", "fr")).toBe(
      "Jean Dupont"
    )
  })

  it("keeps digits", () => {
    expect(nameFromEmail("paul2002@example.com", "fr")).toBe("Paul2002")
  })

  it("falls back to a word in the language when nothing is left", () => {
    expect(nameFromEmail("@example.com", "fr")).toBe("Utilisateur")
    expect(nameFromEmail("...@example.com", "en")).toBe("User")
  })
})

describe("nameOrFromEmail", () => {
  it("keeps the name that was given, trimmed", () => {
    expect(nameOrFromEmail("  Marie  ", "m@example.com", "fr")).toBe("Marie")
  })

  it("makes one from the address when the name is empty or missing", () => {
    expect(nameOrFromEmail("", "marie.curie@example.com", "fr")).toBe(
      "Marie Curie"
    )
    expect(nameOrFromEmail("   ", "marie.curie@example.com", "fr")).toBe(
      "Marie Curie"
    )
    expect(nameOrFromEmail(undefined, "marie.curie@example.com", "fr")).toBe(
      "Marie Curie"
    )
  })
})
