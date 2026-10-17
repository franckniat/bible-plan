import { getBibleVersion, type BibleVersionId } from "@workspace/bible-data"
import {
  chaptersPassage,
  getVerseCount,
  toPassageSlug,
  type BookId,
} from "@workspace/core"

export type VerseSelection = { chapter: number; from: number; to: number }

/** Selection after a tap on a verse: one verse, then a range, then again. */
export function toggleVerse(
  selection: VerseSelection | null,
  chapter: number,
  verse: number
): VerseSelection | null {
  if (!selection || selection.chapter !== chapter) {
    return { chapter, from: verse, to: verse }
  }
  const single = selection.from === selection.to
  if (single && selection.from === verse) return null
  if (single) {
    return {
      chapter,
      from: Math.min(selection.from, verse),
      to: Math.max(selection.from, verse),
    }
  }
  return { chapter, from: verse, to: verse }
}

/**
 * The link to a selection. The address uses the usual numbering of the canon:
 * when the version numbers the chapter differently, the link opens the whole
 * chapter instead of pointing to the wrong verses.
 */
export function shareSlug(
  book: BookId,
  version: BibleVersionId,
  { chapter, from, to }: VerseSelection
): string {
  const canonCount = getVerseCount(book, chapter)
  const count =
    getBibleVersion(version).verseCounts[book]?.[chapter - 1] ?? canonCount
  return count === canonCount
    ? toPassageSlug({
        book,
        start: { chapter, verse: from },
        end: { chapter, verse: to },
      })
    : toPassageSlug(chaptersPassage(book, chapter))
}
