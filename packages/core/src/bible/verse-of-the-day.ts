import { daysBetween } from "../plans/dates"
import type { IsoDate, Locale } from "../schemas/common"
import { parseReference } from "./parse"
import type { Passage } from "./passage"
import pool from "./verse-pool.json"
import verses from "./verses-of-the-day.json"

/** Verses chosen by hand: a date (YYYY-MM-DD) and a reference in French or English. */
export type VerseCalendar = Record<string, string>

/** Small deterministic random numbers (mulberry32): the same seed, the same run. */
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The verse a date gets from the pool. The pool is shuffled, and each day
 * takes the next verse: none comes back before all the others have been seen.
 * Once the pool is used up it is shuffled again, so the order of the next
 * round is new. It only depends on the date, so every visitor sees the same
 * verse all day, on every server, without anything being stored.
 */
export function pickFromPool(date: IsoDate, references: readonly string[]) {
  if (references.length === 0) return null
  const day = daysBetween("1970-01-01", date)
  const round = Math.floor(day / references.length)
  const order = references.map((_, index) => index)
  const next = random(round + 1)
  // Fisher–Yates, with the numbers of this round.
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1))
    ;[order[index], order[other]] = [order[other]!, order[index]!]
  }
  return references[order[day - round * references.length]!]!
}

/**
 * The verse of a day: the one chosen by hand for that date, else a verse
 * drawn from the pool for that date (random, but the same all day for
 * everyone). Null only when the reference cannot be read.
 */
export function findVerseOfTheDay(
  date: IsoDate,
  locale: Locale,
  calendar: VerseCalendar = verses,
  references: readonly string[] = pool
): Passage | null {
  const reference = calendar[date] ?? pickFromPool(date, references)
  if (!reference) return null
  return parseReference(reference, { locale })?.[0] ?? null
}
