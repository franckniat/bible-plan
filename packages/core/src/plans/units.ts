import type { BookId } from "../bible/books"
import type { Passage } from "../bible/passage"
import { getVerseCount } from "../bible/verse-counts"

/**
 * Smallest piece a plan is made of: one chapter, or a range of verses inside
 * one chapter. Its weight is its number of verses.
 */
export type ReadingUnit = {
  book: BookId
  chapter: number
  startVerse: number
  endVerse: number
  verses: number
}

function unit(
  book: BookId,
  chapter: number,
  startVerse: number,
  endVerse: number
): ReadingUnit {
  return {
    book,
    chapter,
    startVerse,
    endVerse,
    verses: endVerse - startVerse + 1,
  }
}

/** Cuts passages into units, one per chapter (or part of chapter), in order. */
export function toUnits(passages: readonly Passage[]): ReadingUnit[] {
  const units: ReadingUnit[] = []
  for (const { book, start, end } of passages) {
    for (let chapter = start.chapter; chapter <= end.chapter; chapter++) {
      units.push(
        unit(
          book,
          chapter,
          chapter === start.chapter ? start.verse : 1,
          chapter === end.chapter ? end.verse : getVerseCount(book, chapter)
        )
      )
    }
  }
  return units
}

/** Whether `next` starts right where `previous` ends. */
function follows(previous: ReadingUnit, next: ReadingUnit): boolean {
  if (previous.book !== next.book) return false
  if (previous.chapter === next.chapter) {
    return next.startVerse === previous.endVerse + 1
  }
  return (
    next.chapter === previous.chapter + 1 &&
    next.startVerse === 1 &&
    previous.endVerse === getVerseCount(previous.book, previous.chapter)
  )
}

/** Joins consecutive units back into passages: Gn 1, Gn 2, Gn 3 → Gn 1-3. */
export function mergeUnits(units: readonly ReadingUnit[]): Passage[] {
  const passages: Passage[] = []
  let previous: ReadingUnit | undefined
  for (const current of units) {
    const last = passages.at(-1)
    if (last && previous && follows(previous, current)) {
      last.end = { chapter: current.chapter, verse: current.endVerse }
    } else {
      passages.push({
        book: current.book,
        start: { chapter: current.chapter, verse: current.startVerse },
        end: { chapter: current.chapter, verse: current.endVerse },
      })
    }
    previous = current
  }
  return passages
}

/** Cuts a unit into `pieces` ranges of verses of nearly equal size. */
function splitUnit(unit: ReadingUnit, pieces: number): ReadingUnit[] {
  const size = Math.floor(unit.verses / pieces)
  const larger = unit.verses % pieces
  const result: ReadingUnit[] = []
  let startVerse = unit.startVerse
  for (let piece = 0; piece < pieces; piece++) {
    const verses = size + (piece < larger ? 1 : 0)
    result.push({
      ...unit,
      startVerse,
      endVerse: startVerse + verses - 1,
      verses,
    })
    startVerse += verses
  }
  return result
}

/**
 * Cuts units longer than `maxVerses` into ranges of verses of nearly equal
 * size (Ps 119 with at most 100 verses → 119:1-88 and 119:89-176), then keeps
 * cutting the longest unit in two until there are at least `minUnits` units.
 */
export function splitLongUnits(
  units: readonly ReadingUnit[],
  {
    maxVerses = Infinity,
    minUnits = 0,
  }: { maxVerses?: number; minUnits?: number }
): ReadingUnit[] {
  const result = units.flatMap((unit) =>
    unit.verses > maxVerses
      ? splitUnit(unit, Math.ceil(unit.verses / maxVerses))
      : [unit]
  )
  while (result.length < minUnits) {
    let longest = 0
    result.forEach((unit, index) => {
      if (unit.verses > result[longest]!.verses) longest = index
    })
    if (result[longest]!.verses < 2) break
    result.splice(longest, 1, ...splitUnit(result[longest]!, 2))
  }
  return result
}
