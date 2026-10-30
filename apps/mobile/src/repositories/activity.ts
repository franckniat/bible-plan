import {
  computeActivityDays,
  computeStreak,
  type ActivityDayTotals,
  type ActivityEvent,
  type IsoDate,
  type Streak,
} from "@workspace/core"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { meditationSessions, prayerLogs, readingProgress } from "@/db/schema"
import type { Database } from "@/db/types"

/** The tables whose changes change the activity. */
const activityTables = ["readingProgress", "prayerLog", "meditationSession"]

/**
 * What was done on the phone, as the server's activity counts it: readings
 * ticked off, "I prayed", and timed sessions on the day they ended.
 */
export function activityEvents(db: Database): ActivityEvent[] {
  return [
    ...db
      .select({ at: readingProgress.completedAt })
      .from(readingProgress)
      .all()
      .map((row) => ({ type: "reading" as const, at: new Date(row.at) })),
    ...db
      .select({ at: prayerLogs.prayedAt })
      .from(prayerLogs)
      .all()
      .map((row) => ({ type: "prayer" as const, at: new Date(row.at) })),
    ...db
      .select()
      .from(meditationSessions)
      .all()
      .map((row) => ({
        type: "session" as const,
        kind: row.kind,
        seconds: row.durationSeconds,
        at: new Date(
          new Date(row.startedAt).getTime() + row.durationSeconds * 1000
        ),
      })),
  ]
}

export type ActivitySummary = {
  /** Days with something done, in date order. */
  days: ActivityDayTotals[]
  streak: Streak
  totals: Omit<ActivityDayTotals, "day"> & { activeDays: number }
}

/**
 * The activity, streaks and totals, computed on the phone from the events
 * themselves (computeActivityDays, computeStreak): the same as the web's.
 */
export function activitySummary(
  db: Database,
  today: IsoDate,
  timeZone: string
): ActivitySummary {
  const days = computeActivityDays(activityEvents(db), timeZone)
  const totals = days.reduce(
    (sum, day) => ({
      readings: sum.readings + day.readings,
      prayers: sum.prayers + day.prayers,
      meditationSeconds: sum.meditationSeconds + day.meditationSeconds,
      prayerSeconds: sum.prayerSeconds + day.prayerSeconds,
      activeDays: sum.activeDays + 1,
    }),
    {
      readings: 0,
      prayers: 0,
      meditationSeconds: 0,
      prayerSeconds: 0,
      activeDays: 0,
    }
  )
  return {
    days,
    streak: computeStreak(
      days.map((day) => day.day),
      today
    ),
    totals,
  }
}

/** The activity, kept up to date. */
export function useActivity(today: IsoDate, timeZone: string): ActivitySummary {
  return useLocalQuery(
    activityTables,
    () => activitySummary(getDatabase(), today, timeZone),
    [today, timeZone]
  )
}
