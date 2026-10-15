import { describe, expect, it } from "vitest"

import { bookIds, books, type BookId } from "./books"
import {
  getBookVerseCount,
  getChapterCount,
  getVerseCount,
  isSingleChapterBook,
  verseCounts,
} from "./verse-counts"

// Verses per book in the King James Version, from a source independent of the
// per-chapter table.
const versesPerBook: Record<BookId, number> = {
  Gen: 1533,
  Exod: 1213,
  Lev: 859,
  Num: 1288,
  Deut: 959,
  Josh: 658,
  Judg: 618,
  Ruth: 85,
  "1Sam": 810,
  "2Sam": 695,
  "1Kgs": 816,
  "2Kgs": 719,
  "1Chr": 942,
  "2Chr": 822,
  Ezra: 280,
  Neh: 406,
  Esth: 167,
  Job: 1070,
  Ps: 2461,
  Prov: 915,
  Eccl: 222,
  Song: 117,
  Isa: 1292,
  Jer: 1364,
  Lam: 154,
  Ezek: 1273,
  Dan: 357,
  Hos: 197,
  Joel: 73,
  Amos: 146,
  Obad: 21,
  Jonah: 48,
  Mic: 105,
  Nah: 47,
  Hab: 56,
  Zeph: 53,
  Hag: 38,
  Zech: 211,
  Mal: 55,
  Matt: 1071,
  Mark: 678,
  Luke: 1151,
  John: 879,
  Acts: 1007,
  Rom: 433,
  "1Cor": 437,
  "2Cor": 257,
  Gal: 149,
  Eph: 155,
  Phil: 104,
  Col: 95,
  "1Thess": 89,
  "2Thess": 47,
  "1Tim": 113,
  "2Tim": 83,
  Titus: 46,
  Phlm: 25,
  Heb: 303,
  Jas: 108,
  "1Pet": 105,
  "2Pet": 61,
  "1John": 105,
  "2John": 13,
  "3John": 14,
  Jude: 25,
  Rev: 404,
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

describe("verse counts", () => {
  it("has 1,189 chapters and 31,102 verses", () => {
    expect(sum(bookIds.map(getChapterCount))).toBe(1189)
    expect(sum(bookIds.map(getBookVerseCount))).toBe(31102)
  })

  it("splits the verses between the testaments", () => {
    const total = (testament: string) =>
      sum(
        books
          .filter((book) => book.testament === testament)
          .map((book) => getBookVerseCount(book.id))
      )
    expect(total("old")).toBe(23145)
    expect(total("new")).toBe(7957)
  })

  it.each(bookIds)("matches the verse total of %s", (id) => {
    expect(getBookVerseCount(id)).toBe(versesPerBook[id])
  })

  it("only has positive whole numbers", () => {
    for (const counts of Object.values(verseCounts)) {
      for (const count of counts) {
        expect(Number.isInteger(count) && count > 0).toBe(true)
      }
    }
  })

  it("gives chapter and verse counts", () => {
    expect(getChapterCount("Ps")).toBe(150)
    expect(getVerseCount("Ps", 119)).toBe(176)
    expect(getVerseCount("Ps", 117)).toBe(2)
    expect(getVerseCount("John", 3)).toBe(36)
    expect(getVerseCount("John", 22)).toBe(0)
    expect(getVerseCount("John", 0)).toBe(0)
  })

  it("knows the one-chapter books", () => {
    expect(bookIds.filter(isSingleChapterBook)).toEqual([
      "Obad",
      "Phlm",
      "2John",
      "3John",
      "Jude",
    ])
  })
})
