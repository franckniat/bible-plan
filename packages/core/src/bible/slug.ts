import { bookIds, isBookId, type BookId } from "./books"
import {
  chaptersPassage,
  coversWholeChapters,
  isValidPassage,
  type Passage,
} from "./passage"
import { getChapterCount } from "./verse-counts"

/**
 * A passage in a URL, with OSIS book codes: "John.3" (chapter),
 * "Gen.1-3" (chapters), "John.3.16" or "Ps.119.1-88" (verses),
 * "Gen.1.1-2.3" (verses over several chapters).
 */
export function toPassageSlug(passage: Passage): string {
  const { book, start, end } = passage
  if (coversWholeChapters(passage)) {
    return start.chapter === end.chapter
      ? `${book}.${start.chapter}`
      : `${book}.${start.chapter}-${end.chapter}`
  }
  const from = `${book}.${start.chapter}.${start.verse}`
  if (start.chapter !== end.chapter) {
    return `${from}-${end.chapter}.${end.verse}`
  }
  return start.verse === end.verse ? from : `${from}-${end.verse}`
}

/** The passage of a slug made by toPassageSlug, or null if invalid. */
export function parsePassageSlug(slug: string): Passage | null {
  const match =
    /^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?(?:-(\d+)(?:\.(\d+))?)?$/.exec(slug)
  if (!match || !isBookId(match[1]!)) return null
  const book = match[1] as BookId
  const [a, b, c, d] = match
    .slice(2)
    .map((value) => (value === undefined ? undefined : Number(value)))
  let passage: Passage
  if (b === undefined) {
    // "Gen.1" or "Gen.1-3"
    if (d !== undefined) return null
    passage = chaptersPassage(book, a!, c ?? a!)
  } else if (d === undefined) {
    // "John.3.16" or "John.3.16-21"
    passage = {
      book,
      start: { chapter: a!, verse: b },
      end: { chapter: a!, verse: c ?? b },
    }
  } else {
    // "Gen.1.1-2.3"
    passage = {
      book,
      start: { chapter: a!, verse: b },
      end: { chapter: c!, verse: d },
    }
  }
  return isValidPassage(passage) ? passage : null
}

/**
 * The chapter before or after one, going over to the previous or next
 * book; null before Genesis 1 and after Revelation 22.
 */
export function adjacentChapter(
  book: BookId,
  chapter: number,
  direction: -1 | 1
): { book: BookId; chapter: number } | null {
  const next = chapter + direction
  if (next >= 1 && next <= getChapterCount(book)) return { book, chapter: next }
  const other = bookIds[bookIds.indexOf(book) + direction]
  if (!other) return null
  return { book: other, chapter: direction === 1 ? 1 : getChapterCount(other) }
}
