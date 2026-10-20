import { addDays, daysBetween } from "../plans/dates"
import type { IsoDate } from "../schemas/common"

export type Streak = {
  /** Days in a row up to today (or up to yesterday if today is still open). */
  current: number
  /** The longest run of days in a row, ever. */
  longest: number
  /** Whether today already counts in the current streak. */
  activeToday: boolean
}

/**
 * Streaks from the days a person was active (reading, prayer or meditation),
 * each a calendar date in their own time zone. `today` is their today, so a
 * streak never breaks at midnight UTC but at their own midnight: a streak
 * that ended yesterday is still alive until the end of today.
 */
export function computeStreak(
  activeDays: readonly IsoDate[],
  today: IsoDate
): Streak {
  // Dates in the future (a clock that moved back) do not count.
  const days = [...new Set(activeDays)].filter((day) => day <= today).sort()
  const set = new Set(days)

  let longest = 0
  let run = 0
  let previous: IsoDate | null = null
  for (const day of days) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }

  const activeToday = set.has(today)
  let cursor = activeToday ? today : addDays(today, -1)
  let current = 0
  while (set.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }
  return { current, longest, activeToday }
}
