import { describe, expect, it } from "vitest"

import { locales } from "../schemas/common"
import { books } from "./books"
import { findBook, parseReference } from "./parse"
import type { Passage } from "./passage"

/** "Gen 1:1-3:24" | "John 3:16-3:16"..., to compare results at a glance. */
const show = (passages: Passage[] | null) =>
  passages
    ?.map(
      ({ book, start, end }) =>
        `${book} ${start.chapter}:${start.verse}-${end.chapter}:${end.verse}`
    )
    .join(" | ") ?? null

describe("parseReference", () => {
  it.each([
    // French
    ["Jn 3:16", "John 3:16-3:16"],
    ["Jean 3.16", "John 3:16-3:16"],
    ["Jn 3,16", "John 3:16-3:16"],
    ["Genèse 1-3", "Gen 1:1-3:24"],
    ["genese 1–3", "Gen 1:1-3:24"],
    ["Ps 119:1-88", "Ps 119:1-119:88"],
    ["Psaume 23", "Ps 23:1-23:6"],
    ["Ésaïe 53:5", "Isa 53:5-53:5"],
    ["Is 40", "Isa 40:1-40:31"],
    ["1 Co 13", "1Cor 13:1-13:13"],
    ["1Co13", "1Cor 13:1-13:13"],
    ["1re Jean 4", "1John 4:1-4:21"],
    ["I Jean 1:9", "1John 1:9-1:9"],
    ["2e Rois 2", "2Kgs 2:1-2:25"],
    ["Deuxième Samuel 1", "2Sam 1:1-1:27"],
    ["Cantique des cantiques 2", "Song 2:1-2:17"],
    ["Actes des apôtres 2", "Acts 2:1-2:47"],
    ["Apocalypse 22:21", "Rev 22:21-22:21"],
    ["Hé 11", "Heb 11:1-11:40"],
    // English
    ["John 3:16", "John 3:16-3:16"],
    ["Gen. 1:1-2:3", "Gen 1:1-2:3"],
    ["Psalm 23", "Ps 23:1-23:6"],
    ["Song of Solomon 2:1", "Song 2:1-2:1"],
    ["Song of Songs 2", "Song 2:1-2:17"],
    ["1 Sam 17", "1Sam 17:1-17:58"],
    ["II Kings 2", "2Kgs 2:1-2:25"],
    ["First John 1", "1John 1:1-1:10"],
    ["Revelation 21—22", "Rev 21:1-22:21"],
    ["Mk 1", "Mark 1:1-1:45"],
    // Whole books and one-chapter books
    ["Ruth", "Ruth 1:1-4:22"],
    ["Phm", "Phlm 1:1-1:25"],
    ["Jude 1", "Jude 1:1-1:25"],
    ["Jude 3", "Jude 1:3-1:3"],
    ["Jude 3-5", "Jude 1:3-1:5"],
    ["2 Jn 4", "2John 1:4-1:4"],
    ["Jude 1:3-5", "Jude 1:3-1:5"],
    // Several references
    ["Matthieu 5-7; Luc 6", "Matt 5:1-7:29 | Luke 6:1-6:49"],
    ["Gn 1; 3", "Gen 1:1-1:31 | Gen 3:1-3:24"],
  ])("reads %s", (input, expected) => {
    expect(show(parseReference(input))).toBe(expected)
  })

  it.each([
    "",
    " ; ",
    "Foo 1",
    "Jn 22",
    "Jn 3:37",
    "Jn 3:0",
    "Gn 3-1",
    "Gn 1:5-1:2",
    "Gn 1-2:3",
    "Jn 3:16-",
    "3:16",
    "Gn 1; Foo 2",
  ])("rejects %j", (input) => {
    expect(parseReference(input)).toBeNull()
  })

  it("prefers the given language when an abbreviation is ambiguous", () => {
    // "Es" is Isaiah in French and Esther in English.
    expect(show(parseReference("Es 4"))).toBe("Isa 4:1-4:6")
    expect(show(parseReference("Es 4", { locale: "en" }))).toBe("Esth 4:1-4:17")
    expect(parseReference("Es 53", { locale: "en" })).toBeNull()
  })
})

describe("findBook", () => {
  it.each(locales)(
    "finds every book from its %s name and abbreviation",
    (locale) => {
      for (const book of books) {
        const { name, abbreviation } = book.names[locale]
        expect(findBook(name, locale)).toBe(book.id)
        expect(findBook(abbreviation, locale)).toBe(book.id)
        expect(findBook(book.id)).toBe(book.id)
      }
    }
  )

  it("ignores case, accents, dots and spaces", () => {
    expect(findBook("ÉZÉCHIEL")).toBe("Ezek")
    expect(findBook("1 thess.")).toBe("1Thess")
    expect(findBook("1thessaloniciens")).toBe("1Thess")
    expect(findBook("Qohélet")).toBe("Eccl")
    expect(findBook("Nothing")).toBeUndefined()
  })
})
