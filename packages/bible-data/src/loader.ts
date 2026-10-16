import type { BookId, Passage } from "@workspace/core"

import { chapterPath, chapterSchema, type BibleChapter } from "./chapter"
import { mapPassage } from "./versification"
import { getBibleVersion, type BibleVersionId } from "./versions"

/** Gets one chapter file (from the site, a bundle, the disk...). */
export type ChapterFetcher = (
  version: BibleVersionId,
  book: BookId,
  chapter: number
) => Promise<BibleChapter>

/**
 * Fetches chapters from where the data folder is served, e.g. "/bible" on
 * the web site. The files are validated before use.
 */
export function fetchChaptersFrom(baseUrl: string): ChapterFetcher {
  const base = baseUrl.replace(/\/$/, "")
  return async (version, book, chapter) => {
    const url = `${base}/${chapterPath(version, book, chapter)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
    return chapterSchema.parse(await response.json())
  }
}

export type PassageText = {
  version: BibleVersionId
  passage: Passage
  /** The verses of each chapter, in the version's own numbering. */
  chapters: { chapter: number; verses: [number, string][] }[]
}

/** The text of a passage of the canon in a version. */
export async function loadPassage(
  passage: Passage,
  version: BibleVersionId,
  fetchChapter: ChapterFetcher
): Promise<PassageText> {
  const ranges = mapPassage(passage, getBibleVersion(version))
  const chapters = await Promise.all(
    ranges.map(async ({ chapter, from, to }) => {
      const { verses } = await fetchChapter(version, passage.book, chapter)
      return {
        chapter,
        verses: verses.filter(([number]) => number >= from && number <= to),
      }
    })
  )
  return { version, passage, chapters }
}
