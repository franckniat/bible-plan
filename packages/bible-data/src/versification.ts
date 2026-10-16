import { getVerseCount, type Passage } from "@workspace/core"

import type { BibleVersion } from "./versions"

/** Verses to read in one chapter, in a version's own numbering. */
export type ChapterRange = { chapter: number; from: number; to: number }

/**
 * Where a passage of the canon (King James numbering, used by the plans)
 * is in a version. Whole chapters are taken whole. For part of a chapter
 * whose verses differ: in the Psalms, the title verses come first; in other
 * books (a chapter break placed a few verses away), the range is mapped in
 * proportion, which is close enough for reading.
 */
export function mapPassage(
  passage: Passage,
  version: Pick<BibleVersion, "verseCounts">
): ChapterRange[] {
  const { book, start, end } = passage
  const ranges: ChapterRange[] = []
  for (let chapter = start.chapter; chapter <= end.chapter; chapter++) {
    const canonCount = getVerseCount(book, chapter)
    const count = version.verseCounts[book]?.[chapter - 1] ?? canonCount
    const from = chapter === start.chapter ? start.verse : 1
    const to = chapter === end.chapter ? end.verse : canonCount
    if (count === canonCount) {
      ranges.push({ chapter, from, to })
      continue
    }
    const offset = count - canonCount
    const map = (verse: number, edge: "from" | "to") => {
      if (edge === "from" && verse === 1) return 1
      if (edge === "to" && verse === canonCount) return count
      const mapped =
        book === "Ps"
          ? verse + offset
          : edge === "from"
            ? Math.round(((verse - 1) * count) / canonCount) + 1
            : Math.round((verse * count) / canonCount)
      return Math.min(count, Math.max(1, mapped))
    }
    const mappedFrom = map(from, "from")
    ranges.push({
      chapter,
      from: mappedFrom,
      to: Math.max(mappedFrom, map(to, "to")),
    })
  }
  return ranges
}
