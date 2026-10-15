import type { Passage } from "./passage"
import { getVerseCount } from "./verse-counts"

/**
 * Average number of words per verse: the King James Version has about
 * 783,000 words for 31,102 verses. Used to turn verses into reading time;
 * it is an estimate (genealogies and psalms have shorter verses).
 */
export const averageWordsPerVerse = 25

/** Number of verses in a passage, bounds included. */
export function countPassageVerses({ book, start, end }: Passage): number {
  if (start.chapter === end.chapter) return end.verse - start.verse + 1
  let total = getVerseCount(book, start.chapter) - start.verse + 1
  for (let chapter = start.chapter + 1; chapter < end.chapter; chapter++) {
    total += getVerseCount(book, chapter)
  }
  return total + end.verse
}

/** Number of verses in several passages. */
export function countVerses(passages: readonly Passage[]): number {
  return passages.reduce(
    (total, passage) => total + countPassageVerses(passage),
    0
  )
}

function assertReadingSpeed(readingWpm: number) {
  if (!(readingWpm > 0)) {
    throw new RangeError(`Invalid reading speed: ${readingWpm} words/min`)
  }
}

/** Estimated reading time, in minutes (not rounded), of a number of verses. */
export function estimateReadingMinutes(
  verses: number,
  readingWpm: number
): number {
  assertReadingSpeed(readingWpm)
  return (verses * averageWordsPerVerse) / readingWpm
}

/** Number of verses that can be read in `minutes` (rounded down). */
export function versesForMinutes(minutes: number, readingWpm: number): number {
  assertReadingSpeed(readingWpm)
  return Math.floor((minutes * readingWpm) / averageWordsPerVerse)
}
