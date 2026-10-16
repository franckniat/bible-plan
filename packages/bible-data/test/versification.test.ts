import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { bookIds, getChapterCount, verseCounts } from "@workspace/core"

import { chapterSchema, type BibleChapter } from "../src/chapter"
import { lsg1910Differences } from "./lsg1910-differences"

const data = fileURLToPath(new URL("../data/", import.meta.url))

function readChapters(version: string): BibleChapter[] {
  return bookIds.flatMap((book) =>
    readdirSync(join(data, version, book)).map((file) =>
      chapterSchema.parse(
        JSON.parse(readFileSync(join(data, version, book, file), "utf8"))
      )
    )
  )
}

function readIndex(version: string): {
  version: string
  verseCounts: Record<string, number[]>
} {
  return JSON.parse(readFileSync(join(data, version, "index.json"), "utf8"))
}

describe.each(["lsg1910", "kjv"])("%s", (version) => {
  const chapters = readChapters(version)
  const index = readIndex(version)

  it("has every chapter of every book of the canon", () => {
    expect(chapters).toHaveLength(1189)
    for (const book of bookIds) {
      const numbers = chapters
        .filter((chapter) => chapter.book === book)
        .map((chapter) => chapter.chapter)
        .sort((a, b) => a - b)
      expect(numbers, book).toEqual(
        Array.from({ length: getChapterCount(book) }, (_, i) => i + 1)
      )
    }
    expect(readdirSync(join(data, version)).sort()).toEqual(
      [...bookIds, "index.json"].sort()
    )
  })

  it("numbers the verses of each chapter 1, 2, 3...", () => {
    for (const chapter of chapters) {
      expect(chapter.version).toBe(version)
      expect(
        chapter.verses.map(([number]) => number),
        `${chapter.book} ${chapter.chapter}`
      ).toEqual(chapter.verses.map((_, i) => i + 1))
    }
  })

  it("lists the verses of each chapter in index.json", () => {
    expect(index.version).toBe(version)
    for (const chapter of chapters) {
      expect(index.verseCounts[chapter.book]![chapter.chapter - 1]).toBe(
        chapter.verses.length
      )
    }
  })
})

describe("versification", () => {
  it("is the canon's for the King James Version", () => {
    expect(readIndex("kjv").verseCounts).toEqual(verseCounts)
  })

  it("differs from the canon in the documented Louis Segond chapters only", () => {
    const lsg = readIndex("lsg1910").verseCounts
    const differences: Record<string, [number, number]> = {}
    for (const book of bookIds) {
      verseCounts[book].forEach((canon, index) => {
        const count = lsg[book]![index]!
        if (count !== canon)
          differences[`${book} ${index + 1}`] = [count, canon]
      })
    }
    expect(differences).toEqual(lsg1910Differences)
    const total = Object.values(lsg)
      .flat()
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(31170)
  })
})
