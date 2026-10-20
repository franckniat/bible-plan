import { addDays, getWeekday } from "../plans/dates"
import type { IsoDate } from "../schemas/common"

export type HeatmapDay = {
  readings: number
  prayers: number
  meditationSeconds: number
  /** Optional: sessions of prayer with the timer. */
  prayerSeconds?: number
}

export type HeatmapCell = {
  date: IsoDate
  /** 0 when nothing was done, up to 4 for a full day. */
  level: 0 | 1 | 2 | 3 | 4
  /** After today: shown empty, not counted as a missed day. */
  future: boolean
}

/**
 * How full a day was: a reading, a prayer and five minutes of meditation
 * each weigh the same, so a day with all three is the fullest.
 */
export function activityLevel(day: HeatmapDay | undefined): HeatmapCell["level"] {
  if (!day) return 0
  const score =
    Math.min(day.readings, 2) +
    Math.min(day.prayers, 2) +
    Math.min(
      Math.floor((day.meditationSeconds + (day.prayerSeconds ?? 0)) / 300),
      2
    ) +
    // Any activity at all is at least a first level.
    (day.readings +
      day.prayers +
      day.meditationSeconds +
      (day.prayerSeconds ?? 0) >
    0
      ? 1
      : 0)
  return Math.min(4, score) as HeatmapCell["level"]
}

/**
 * The weeks of a heatmap, oldest first, each a column of 7 days from Monday
 * to Sunday, ending with the week of `today`. Days after today are marked.
 */
export function buildHeatmap(
  days: ReadonlyMap<IsoDate, HeatmapDay>,
  today: IsoDate,
  weeks: number
): HeatmapCell[][] {
  // Monday of the current week (0 = Sunday, so Sunday is 6 days after Monday).
  const sinceMonday = (getWeekday(today) + 6) % 7
  const firstMonday = addDays(today, -sinceMonday - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(firstMonday, week * 7 + weekday)
      const future = date > today
      return {
        date,
        level: future ? 0 : activityLevel(days.get(date)),
        future,
      }
    })
  )
}
