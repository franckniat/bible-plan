import {
  parseReference,
  type IsoDate,
  type Locale,
  type Passage,
} from "@workspace/core"

import verses from "@/content/verses-of-the-day.json"

/** Verses chosen by hand: a date (YYYY-MM-DD) and a reference in French or English. */
export type VerseCalendar = Record<string, string>

/**
 * The verse of a day: the one chosen for that date, else the last one chosen
 * before it (so the page is never empty when a day was not planned). Null
 * before the first date or when the reference cannot be read.
 */
export function findVerseOfTheDay(
  date: IsoDate,
  locale: Locale,
  calendar: VerseCalendar = verses
): Passage | null {
  const chosen = Object.keys(calendar)
    .filter((day) => day <= date)
    .sort()
    .at(-1)
  if (!chosen) return null
  return parseReference(calendar[chosen]!, { locale })?.[0] ?? null
}
