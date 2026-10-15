import { describe, expect, it } from "vitest"

import { locales } from "../schemas/common"
import { bookIds, books, getBook, getBookName, isBookId } from "./books"

describe("books", () => {
  it("lists the 66 books in canonical order", () => {
    expect(books).toHaveLength(66)
    expect(books.map((book) => book.id)).toEqual(bookIds)
    expect(books.map((book) => book.order)).toEqual(
      Array.from({ length: 66 }, (_, index) => index + 1)
    )
  })

  it("has 39 Old Testament and 27 New Testament books", () => {
    const old = books.filter((book) => book.testament === "old")
    expect(old).toHaveLength(39)
    expect(old.at(-1)?.id).toBe("Mal")
    expect(books.filter((book) => book.testament === "new")[0]?.id).toBe("Matt")
  })

  it("groups the books by genre", () => {
    const ids = (genre: string) =>
      books.filter((book) => book.genre === genre).map((book) => book.id)
    expect(ids("law")).toEqual(["Gen", "Exod", "Lev", "Num", "Deut"])
    expect(ids("gospels")).toEqual(["Matt", "Mark", "Luke", "John"])
    expect(ids("minorProphets")).toHaveLength(12)
    expect(ids("paulineEpistles")).toHaveLength(13)
    expect(ids("apocalyptic")).toEqual(["Rev"])
  })

  it.each(locales)("has unique names and abbreviations in %s", (locale) => {
    const names = books.map((book) => book.names[locale].name)
    const abbreviations = books.map((book) => book.names[locale].abbreviation)
    expect(new Set(names).size).toBe(66)
    expect(new Set(abbreviations).size).toBe(66)
  })

  it("gives localized names", () => {
    expect(getBookName("Isa", "fr")).toBe("Ésaïe")
    expect(getBookName("Isa", "en", "short")).toBe("Isa")
    expect(getBookName("1Cor", "fr", "short")).toBe("1 Co")
    expect(getBook("Song").names.en.name).toBe("Song of Solomon")
  })

  it("recognizes OSIS identifiers", () => {
    expect(isBookId("1John")).toBe(true)
    expect(isBookId("Jn")).toBe(false)
  })
})
