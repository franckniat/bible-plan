import {
  bibleVersions,
  getBibleVersion,
  isBibleVersionId,
  versionVersesOf,
  type BibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"
import type { BookId } from "@workspace/core"

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
