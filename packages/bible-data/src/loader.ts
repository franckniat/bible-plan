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
 * the web site. The files are validated before use. A version served by the
 * YouVersion API (`remoteBaseUrl`, e.g. "/api/bible") is asked from there as
 * `<remote>/<version>/<book>/<chapter>`: the site's server holds the API key.
 */
export function fetchChaptersFrom(
  baseUrl: string,
  { remoteBaseUrl }: { remoteBaseUrl?: string } = {}
): ChapterFetcher {
  const base = baseUrl.replace(/\/$/, "")
  const remote = remoteBaseUrl?.replace(/\/$/, "")
  return async (version, book, chapter) => {
    const url =
      remote && getBibleVersion(version).kind === "youversion"
        ? `${remote}/${version}/${book}/${chapter}`
        : `${base}/${chapterPath(version, book, chapter)}`
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
