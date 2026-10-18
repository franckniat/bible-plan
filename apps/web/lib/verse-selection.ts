import { getBibleVersion, type BibleVersionId } from "@workspace/bible-data"
import {
  chaptersPassage,
  formatPassage,
  getVerseCount,
  isSingleChapterBook,
  toPassageSlug,
  type BookId,
  type Locale,
} from "@workspace/core"

/**
 * Verses picked in one chapter, in the numbering of the version on screen:
 * sorted, without duplicates, not necessarily next to each other.
 */
export type VerseSelection = { chapter: number; verses: number[] }

const RANGE = "–"

/** Selection after a tap on a verse: it is added, or removed if it was there. */
export function toggleVerse(
  selection: VerseSelection | null,
  chapter: number,
  verse: number
): VerseSelection | null {
  // A selection stays in one chapter: another chapter starts a new one.
  if (!selection || selection.chapter !== chapter) {
    return { chapter, verses: [verse] }
  }
  const verses = selection.verses.includes(verse)
    ? selection.verses.filter((number) => number !== verse)
    : [...selection.verses, verse].sort((a, b) => a - b)
  return verses.length > 0 ? { chapter, verses } : null
}

/** Runs of consecutive verses: [16, 18, 19, 20] is [[16, 16], [18, 20]]. */
export function verseRanges(verses: readonly number[]): [number, number][] {
  const sorted = [...new Set(verses)].sort((a, b) => a - b)
  const ranges: [number, number][] = []
  for (const verse of sorted) {
    const last = ranges.at(-1)
    if (last && verse === last[1] + 1) last[1] = verse
    else ranges.push([verse, verse])
  }
  return ranges
}

/** "16, 18–20": the verses as they are written in a reference. */
export function formatVerseRanges(verses: readonly number[]): string {
  return verseRanges(verses)
    .map(([from, to]) => (from === to ? `${from}` : `${from}${RANGE}${to}`))
    .join(", ")
}

/** "Jean 3:16, 18–20", "Psaume 23:1", "Jude 5, 7–9". */
export function selectionReference(
  book: BookId,
  { chapter, verses }: VerseSelection,
  locale: Locale
): string {
  const chapterName = formatPassage(chaptersPassage(book, chapter), locale)
  const numbers = formatVerseRanges(verses)
  // A book of one chapter has no chapter number: "Jude 5", not "Jude:5".
  return isSingleChapterBook(book)
    ? `${chapterName} ${numbers}`
    : `${chapterName}:${numbers}`
}

/** The `sel` parameter of a link: "16,18-20". */
export function formatSelectionParam(verses: readonly number[]): string {
  return verseRanges(verses)
    .map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`))
    .join(",")
}

/** The most verses a link can select (the longest chapter has 176). */
const maxSelectedVerses = 200

/**
 * Reads the `sel` parameter back ("16,18-20"). Anything that is not a list of
 * verses or ranges gives no selection.
 */
export function parseSelectionParam(value: unknown): number[] {
  if (typeof value !== "string") return []
  const verses = new Set<number>()
  for (const part of value.split(",")) {
    const match = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(part)
    if (!match) return []
    const from = Number(match[1])
    const to = match[2] === undefined ? from : Number(match[2])
    if (
      from < 1 ||
      to < from ||
      verses.size + (to - from + 1) > maxSelectedVerses
    ) {
      return []
    }
    for (let verse = from; verse <= to; verse++) verses.add(verse)
  }
  return [...verses].sort((a, b) => a - b)
}

/**
 * Where a selection can be opened (path and query, without the language).
 * A run of verses in a chapter the version numbers like the canon is a link
 * to those verses; anything else (verses apart, or a chapter numbered
 * differently) opens the chapter with the verses in `sel`, read in the
 * numbering of the version in `v`.
 */
export function selectionHref(
  book: BookId,
  version: BibleVersionId,
  { chapter, verses }: VerseSelection
): string {
  const canonCount = getVerseCount(book, chapter)
  const count =
    getBibleVersion(version).verseCounts[book]?.[chapter - 1] ?? canonCount
  const ranges = verseRanges(verses)

  if (ranges.length === 1 && count === canonCount) {
    const [from, to] = ranges[0]!
    const slug = toPassageSlug({
      book,
      start: { chapter, verse: from },
      end: { chapter, verse: to },
    })
    return `/read/${slug}?v=${version}`
  }
  const slug = toPassageSlug(chaptersPassage(book, chapter))
  return `/read/${slug}?v=${version}&sel=${formatSelectionParam(verses)}`
}
