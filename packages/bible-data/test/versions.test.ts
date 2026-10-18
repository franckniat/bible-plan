import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { bookIds, getChapterCount } from "@workspace/core"

import { chapterPath } from "../src/chapter"
import {
  bibleVersions,
  defaultBibleVersion,
  getBibleVersion,
  isBibleVersionId,
} from "../src/versions"

const data = join(import.meta.dirname, "..", "data")

describe("bible versions registry", () => {
  it("has a different id for every version", () => {
    const ids = bibleVersions.map((version) => version.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(bibleVersions.map((version) => [version.id, version] as const))(
    "%s has its chapter files, and as many chapters as the canon",
    (id, version) => {
      for (const book of bookIds) {
        const counts = version.verseCounts[book]
        expect(counts, `${id} ${book}`).toHaveLength(getChapterCount(book))
        for (let chapter = 1; chapter <= getChapterCount(book); chapter++) {
          expect(
            existsSync(join(data, chapterPath(id, book, chapter))),
            `${id}/${book}/${chapter}.json`
          ).toBe(true)
        }
      }
    }
  )

  it("has a default version for each language of the app", () => {
    expect(getBibleVersion(defaultBibleVersion("fr")).language).toBe("fr")
    expect(getBibleVersion(defaultBibleVersion("en")).language).toBe("en")
  })

  it("recognises its ids", () => {
    expect(isBibleVersionId("kjv")).toBe(true)
    expect(isBibleVersionId("nope")).toBe(false)
  })
})
