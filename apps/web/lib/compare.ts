import {
  bibleVersions,
  getBibleVersion,
  isBibleVersionId,
  versionVersesOf,
  type BibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"
import { getVerseCount, type BookId } from "@workspace/core"

/** The most versions side by side, to keep each column readable. */
export const maxComparedVersions = 3

/**
 * The versions to compare when the reader asks for it: the one on screen
 * first, then what was compared last time, then the first other version.
 * Never less than two when the app has two.
 */
export function defaultComparison(
  current: BibleVersionId,
  remembered: readonly unknown[] = [],
  available: readonly Pick<BibleVersion, "id">[] = bibleVersions
): BibleVersionId[] {
  const known = new Set(available.map((version) => version.id))
  const chosen: BibleVersionId[] = [current]
  const add = (id: BibleVersionId) => {
    if (
      known.has(id) &&
      !chosen.includes(id) &&
      chosen.length < maxComparedVersions
    ) {
      chosen.push(id)
    }
  }
  remembered.filter(isBibleVersionId).forEach(add)
  // Nothing remembered: the first other version is enough to compare with.
  for (const version of available) {
    if (chosen.length >= 2) break
    add(version.id)
  }
  return chosen
}

/** A version added to or removed from the comparison (at least one stays). */
export function toggleComparedVersion(
  chosen: readonly BibleVersionId[],
  id: BibleVersionId
): BibleVersionId[] {
  if (chosen.includes(id)) {
    return chosen.length > 1
      ? chosen.filter((other) => other !== id)
      : [...chosen]
  }
  return chosen.length < maxComparedVersions ? [...chosen, id] : [...chosen]
}

/**
 * The verses of a version that show some verses of the canon, in the
 * numbering of that version (a psalm title counted as verses comes with the
 * first verse).
 */
export function versesInVersion(
  book: BookId,
  chapter: number,
  canonVerses: readonly number[],
  version: BibleVersionId
): number[] {
  const verses = new Set<number>()
  for (const canon of canonVerses) {
    const { from, to } = versionVersesOf(
      book,
      chapter,
      canon,
      getBibleVersion(version)
    )
    for (let verse = from; verse <= to; verse++) verses.add(verse)
  }
  return [...verses].sort((a, b) => a - b)
}

/**
 * The versions a link asks to read next to the main one: `compare=kjv` or a
 * list `compare=kjv,lsg1910`. Unknown ids, the main version and repeats are
 * dropped, and there are never more than the columns that fit.
 */
export function parseCompareParam(
  value: unknown,
  main: BibleVersionId
): BibleVersionId[] {
  if (typeof value !== "string") return []
  const others: BibleVersionId[] = []
  for (const id of value.split(",")) {
    if (isBibleVersionId(id) && id !== main && !others.includes(id)) {
      others.push(id)
    }
  }
  return others.slice(0, maxComparedVersions - 1)
}

/** The `compare` parameter for some versions (the main one is not in it). */
export function formatCompareParam(others: readonly BibleVersionId[]): string {
  return others.join(",")
}

/** One row of the parallel reading: a verse of the canon in each version. */
export type ParallelRow = {
  canon: number
  /** For each version, in order, the verses shown for this canon verse. */
  cells: [number, string][][]
}

/**
 * The rows of a chapter read in several versions. Each row is a verse of the
 * canon, so the versions stay aligned whatever their numbering: the title of
 * Psalm 51, verses 1 to 3 of the Louis Segond, sits in the row of verse 1 of
 * the King James. A verse of a version is shown once, in the first row that
 * reaches it.
 */
export function parallelRows(
  book: BookId,
  chapter: number,
  versions: readonly BibleVersionId[],
  texts: Readonly<Record<string, readonly [number, string][]>>
): ParallelRow[] {
  const shown = new Map<string, Set<number>>(
    versions.map((version) => [version, new Set<number>()])
  )
  const canonCount = getVerseCount(book, chapter)
  const rows: ParallelRow[] = []
  for (let canon = 1; canon <= canonCount; canon++) {
    const cells = versions.map((version) => {
      const seen = shown.get(version)!
      const wanted = versesInVersion(book, chapter, [canon], version)
      const verses = (texts[version] ?? []).filter(
        ([number]) => wanted.includes(number) && !seen.has(number)
      )
      for (const [number] of verses) seen.add(number)
      return verses
    })
    rows.push({ canon, cells })
  }
  return rows
}
