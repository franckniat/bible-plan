import { describe, expect, it } from "vitest"

import { locales } from "../schemas/common"
import { books } from "./books"
import { formatPassage, formatPassages } from "./format"
import { parseReference } from "./parse"
import { bookPassage, chaptersPassage, type Passage } from "./passage"
import { getChapterCount, getVerseCount } from "./verse-counts"

const parseOne = (input: string) => parseReference(input)![0]!

describe("formatPassage", () => {
  it.each([
    ["Gn 1", "Genèse 1", "Gn 1", "Genesis 1", "Gen 1"],
    ["Gn 1-3", "Genèse 1–3", "Gn 1–3", "Genesis 1–3", "Gen 1–3"],
    ["Jn 3:16", "Jean 3:16", "Jn 3:16", "John 3:16", "John 3:16"],
    [
      "Ps 119:1-88",
      "Psaume 119:1–88",
      "Ps 119:1–88",
      "Psalm 119:1–88",
      "Ps 119:1–88",
    ],
    ["Ps 1-2", "Psaumes 1–2", "Ps 1–2", "Psalms 1–2", "Ps 1–2"],
    [
      "Gn 1:1-2:3",
      "Genèse 1:1–2:3",
      "Gn 1:1–2:3",
      "Genesis 1:1–2:3",
      "Gen 1:1–2:3",
    ],
    ["Ruth", "Ruth 1–4", "Rt 1–4", "Ruth 1–4", "Ruth 1–4"],
    ["Jude", "Jude", "Jud", "Jude", "Jude"],
    ["Jude 3-5", "Jude 3–5", "Jud 3–5", "Jude 3–5", "Jude 3–5"],
    ["1 S 17", "1 Samuel 17", "1 S 17", "1 Samuel 17", "1 Sam 17"],
  ])("writes %s", (input, frLong, frShort, enLong, enShort) => {
    const passage = parseOne(input)
    expect(formatPassage(passage, "fr")).toBe(frLong)
    expect(formatPassage(passage, "fr", { style: "short" })).toBe(frShort)
    expect(formatPassage(passage, "en")).toBe(enLong)
    expect(formatPassage(passage, "en", { style: "short" })).toBe(enShort)
  })

  it("joins several passages", () => {
    expect(
      formatPassages(parseReference("Mt 5-7; Lc 6")!, "fr", { style: "short" })
    ).toBe("Mt 5–7; Lc 6")
  })

  it("is read back by the parser for every book", () => {
    for (const book of books) {
      const last = getChapterCount(book.id)
      const lastVerses = getVerseCount(book.id, last)
      const samples: Passage[] = [
        bookPassage(book.id),
        chaptersPassage(book.id, 1),
        chaptersPassage(book.id, last),
        {
          book: book.id,
          start: { chapter: last, verse: 1 },
          end: { chapter: last, verse: Math.min(2, lastVerses) },
        },
        {
          book: book.id,
          start: { chapter: last, verse: lastVerses },
          end: { chapter: last, verse: lastVerses },
        },
      ]
      if (last > 1) {
        samples.push({
          book: book.id,
          start: { chapter: 1, verse: 2 },
          end: { chapter: 2, verse: 1 },
        })
      }
      for (const passage of samples) {
        for (const locale of locales) {
          for (const style of ["long", "short"] as const) {
            const text = formatPassage(passage, locale, { style })
            expect(parseReference(text, { locale }), text).toEqual([passage])
          }
        }
      }
    }
  })
})
