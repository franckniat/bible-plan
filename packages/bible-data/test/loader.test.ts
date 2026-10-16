import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  bookIds,
  getChapterCount,
  getVerseCount,
  parseReference,
  type Passage,
} from "@workspace/core"

import { chapterPath, chapterSchema } from "../src/chapter"
import { loadPassage, type ChapterFetcher } from "../src/loader"
import { mapPassage } from "../src/versification"
import {
  bibleVersions,
  defaultBibleVersion,
  getBibleVersion,
  isBibleVersionId,
} from "../src/versions"

const data = new URL("../data/", import.meta.url)
const fromDisk: ChapterFetcher = async (version, book, chapter) =>
  chapterSchema.parse(
    JSON.parse(
      await readFile(
        fileURLToPath(new URL(chapterPath(version, book, chapter), data)),
        "utf8"
      )
    )
  )

const passage = (reference: string): Passage => parseReference(reference)![0]!
const lsg = getBibleVersion("lsg1910")
const kjv = getBibleVersion("kjv")

describe("version registry", () => {
  it("lists the public-domain versions", () => {
    expect(bibleVersions.map((version) => version.id)).toEqual([
      "lsg1910",
      "kjv",
    ])
    expect(isBibleVersionId("kjv")).toBe(true)
    expect(isBibleVersionId("niv")).toBe(false)
    for (const version of bibleVersions) {
      expect(Object.keys(version.verseCounts)).toEqual(bookIds)
    }
  })

  it("picks the version of the user's language by default", () => {
    expect(defaultBibleVersion("fr")).toBe("lsg1910")
    expect(defaultBibleVersion("en")).toBe("kjv")
  })
})

describe("mapPassage", () => {
  it("keeps the numbering when the version follows the canon", () => {
    expect(mapPassage(passage("Jn 3:16"), kjv)).toEqual([
      { chapter: 3, from: 16, to: 16 },
    ])
    expect(mapPassage(passage("Gn 1-2"), lsg)).toEqual([
      { chapter: 1, from: 1, to: 31 },
      { chapter: 2, from: 1, to: 25 },
    ])
  })

  it("reads whole chapters whole", () => {
    // Psalm 51 has 21 verses in the LSG (two of title), 19 in the canon.
    expect(mapPassage(passage("Ps 51"), lsg)).toEqual([
      { chapter: 51, from: 1, to: 21 },
    ])
    expect(mapPassage(passage("Ex 8"), lsg)).toEqual([
      { chapter: 8, from: 1, to: 28 },
    ])
  })

  it("adds the title verses in the Psalms", () => {
    expect(mapPassage(passage("Ps 51:1-10"), lsg)).toEqual([
      { chapter: 51, from: 1, to: 12 },
    ])
    expect(mapPassage(passage("Ps 51:3-5"), lsg)).toEqual([
      { chapter: 51, from: 5, to: 7 },
    ])
    expect(mapPassage(passage("Ps 119:89-176"), lsg)).toEqual([
      { chapter: 119, from: 89, to: 176 },
    ])
  })

  it("covers a split chapter without gap or overlap, in every version", () => {
    for (const version of bibleVersions) {
      for (const book of bookIds) {
        for (let chapter = 1; chapter <= getChapterCount(book); chapter++) {
          const canon = getVerseCount(book, chapter)
          if (canon < 2) continue
          const count = version.verseCounts[book]![chapter - 1]!
          for (const middle of [1, Math.floor(canon / 2), canon - 1]) {
            const first = mapPassage(
              {
                book,
                start: { chapter, verse: 1 },
                end: { chapter, verse: middle },
              },
              version
            )[0]!
            const second = mapPassage(
              {
                book,
                start: { chapter, verse: middle + 1 },
                end: { chapter, verse: canon },
              },
              version
            )[0]!
            const label = `${version.id} ${book} ${chapter}:${middle}`
            expect(first.from, label).toBe(1)
            expect(second.to, label).toBe(count)
            expect(second.from, label).toBe(first.to + 1)
          }
        }
      }
    }
  })
})

describe("loadPassage", () => {
  it("loads the text of a verse in each version", async () => {
    const french = await loadPassage(passage("Jn 3:16"), "lsg1910", fromDisk)
    const english = await loadPassage(passage("Jn 3:16"), "kjv", fromDisk)
    expect(french.chapters[0]!.verses[0]![1]).toMatch(
      /^Car Dieu a tant aimé le monde/
    )
    // The KJV starts a paragraph here (¶).
    expect(english.chapters[0]!.verses[0]![1]).toMatch(
      /^¶ For God so loved the world/
    )
  })

  it("loads several chapters", async () => {
    const text = await loadPassage(passage("Ps 117-118"), "kjv", fromDisk)
    expect(text.chapters.map((chapter) => chapter.chapter)).toEqual([117, 118])
    expect(text.chapters.map((chapter) => chapter.verses.length)).toEqual([
      2, 29,
    ])
  })

  it("loads the Psalm title verses of the LSG", async () => {
    const text = await loadPassage(passage("Ps 51:1-2"), "lsg1910", fromDisk)
    expect(text.chapters[0]!.verses.map(([number]) => number)).toEqual([
      1, 2, 3, 4,
    ])
    expect(text.chapters[0]!.verses[0]![1]).toBe(
      "Au chef des chantres. Psaume de David."
    )
  })
})
