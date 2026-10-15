import { z } from "zod"

import { bookIds, type BookId } from "./books"
import { getChapterCount, getVerseCount } from "./verse-counts"

/** A verse of a book, e.g. chapter 3, verse 16. */
export type VersePosition = { chapter: number; verse: number }

/**
 * A contiguous range of verses inside one book, bounds included: "Jn 3:16"
 * is { book: "John", start: 3:16, end: 3:16 }, "Gn 1-3" goes from 1:1 to 3:24.
 */
export type Passage = {
  book: BookId
  start: VersePosition
  end: VersePosition
}

/** Negative if `a` comes before `b`, 0 if equal, positive otherwise. */
export function comparePositions(a: VersePosition, b: VersePosition): number {
  return a.chapter - b.chapter || a.verse - b.verse
}

/** Whole chapters `from` to `to` (inclusive) of a book. */
export function chaptersPassage(
  book: BookId,
  from: number,
  to: number = from
): Passage {
  return {
    book,
    start: { chapter: from, verse: 1 },
    end: { chapter: to, verse: getVerseCount(book, to) },
  }
}

/** The whole book. */
export function bookPassage(book: BookId): Passage {
  return chaptersPassage(book, 1, getChapterCount(book))
}

/** Whether both bounds exist in the book and the start is not after the end. */
export function isValidPassage({ book, start, end }: Passage): boolean {
  const exists = ({ chapter, verse }: VersePosition) =>
    Number.isInteger(chapter) &&
    Number.isInteger(verse) &&
    verse >= 1 &&
    verse <= getVerseCount(book, chapter)
  return exists(start) && exists(end) && comparePositions(start, end) <= 0
}

/** Whether the passage starts and ends on chapter boundaries. */
export function coversWholeChapters({ book, start, end }: Passage): boolean {
  return start.verse === 1 && end.verse === getVerseCount(book, end.chapter)
}

const versePositionSchema = z.object({
  chapter: z.int().min(1),
  verse: z.int().min(1),
})

/** A passage received from outside (form, API), checked against the canon. */
export const passageSchema = z
  .object({
    book: z.enum(bookIds),
    start: versePositionSchema,
    end: versePositionSchema,
  })
  .refine(isValidPassage, { error: "invalid_passage" })
