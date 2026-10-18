import {
  fetchChaptersFrom,
  type BibleChapter,
  type BibleVersionId,
} from "@workspace/bible-data"
import type { BookId } from "@workspace/core"

const fetchChapter = fetchChaptersFrom("/bible")

// Chapters already asked for, so choosing versions again does not fetch again.
const chapters = new Map<string, Promise<BibleChapter>>()

/** A chapter of a version, fetched once per page load. */
export function loadChapter(
  version: BibleVersionId,
  book: BookId,
  chapter: number
): Promise<BibleChapter> {
  const key = `${version}/${book}/${chapter}`
  let loading = chapters.get(key)
  if (!loading) {
    loading = fetchChapter(version, book, chapter)
    // A failure is not kept: the next try asks again.
    loading.catch(() => chapters.delete(key))
    chapters.set(key, loading)
  }
  return loading
}
