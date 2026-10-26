import "server-only"

import {
  computeActivityDays,
  type ActivityDayTotals,
  type IsoDate,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type ActivityDb = Pick<PrismaClient, "activityDay">

/** What refreshActivity reads and writes. */
export type ActivityEventsDb = Pick<
  PrismaClient,
  | "activityDay"
  | "readingProgress"
  | "prayerLog"
  | "meditationSession"
  | "$transaction"
>

export type ActivityEntry = ActivityDayTotals

/** A calendar date as stored in a DATE column (midnight UTC). */
function dateOnly(day: IsoDate): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

/**
 * Computes the activity of a person again from what they did (readings
 * ticked off, prayers, timed sessions) and stores it, in their time zone.
 * Run after each of these changes: the result depends only on the events,
 * so running it again changes nothing and a reading ticked off again leaves
 * the day it was read. Activity is a record of what happened, so a failure
 * here must not undo the change that caused it: callers log it.
 */
export async function refreshActivity(
  db: ActivityEventsDb,
  userId: string,
  timeZone: string | null | undefined
): Promise<void> {
  const [readings, prayers, sessions] = await Promise.all([
    db.readingProgress.findMany({
      where: { enrollment: { userId } },
      select: { completedAt: true },
    }),
    db.prayerLog.findMany({ where: { userId }, select: { prayedAt: true } }),
    db.meditationSession.findMany({
      where: { userId },
      select: { kind: true, durationSeconds: true, createdAt: true },
    }),
  ])
  const days = computeActivityDays(
    [
      ...readings.map((row) => ({
        type: "reading" as const,
        at: row.completedAt,
      })),
      ...prayers.map((row) => ({ type: "prayer" as const, at: row.prayedAt })),
      // A session counts on the day it was saved, at its end.
      ...sessions.map((row) => ({
        type: "session" as const,
        kind: row.kind,
        seconds: row.durationSeconds,
        at: row.createdAt,
      })),
    ],
    timeZone
  )
  await db.$transaction([
    db.activityDay.deleteMany({ where: { userId } }),
    db.activityDay.createMany({
      data: days.map(({ day, ...totals }) => ({
        userId,
        day: dateOnly(day),
        ...totals,
      })),
    }),
  ])
}

const select = {
  day: true,
  readings: true,
  prayers: true,
  meditationSeconds: true,
  prayerSeconds: true,
} as const

/** The days with something done, between two dates (both included). */
export async function listActivity(
  db: ActivityDb,
  userId: string,
  from: IsoDate,
  to: IsoDate
): Promise<ActivityEntry[]> {
  const rows = await db.activityDay.findMany({
    where: { userId, day: { gte: dateOnly(from), lte: dateOnly(to) } },
    select,
    orderBy: { day: "asc" },
  })
  return rows
    .map((row) => ({ ...row, day: row.day.toISOString().slice(0, 10) }))
    .filter(isActive)
}

/** Every day with something done, for the streaks. */
export async function listActiveDays(
  db: ActivityDb,
  userId: string
): Promise<IsoDate[]> {
  const rows = await db.activityDay.findMany({
    where: {
      userId,
      OR: [
        { readings: { gt: 0 } },
        { prayers: { gt: 0 } },
        { meditationSeconds: { gt: 0 } },
        { prayerSeconds: { gt: 0 } },
      ],
    },
    select: { day: true },
    orderBy: { day: "asc" },
  })
  return rows.map((row) => row.day.toISOString().slice(0, 10))
}

/** Everything done so far. */
export async function activityTotals(
  db: ActivityDb,
  userId: string
): Promise<{
  readings: number
  prayers: number
  meditationSeconds: number
  prayerSeconds: number
  activeDays: number
}> {
  const [sums, activeDays] = await Promise.all([
    db.activityDay.aggregate({
      where: { userId },
      _sum: {
        readings: true,
        prayers: true,
        meditationSeconds: true,
        prayerSeconds: true,
      },
    }),
    db.activityDay.count({
      where: {
        userId,
        OR: [
          { readings: { gt: 0 } },
          { prayers: { gt: 0 } },
          { meditationSeconds: { gt: 0 } },
          { prayerSeconds: { gt: 0 } },
        ],
      },
    }),
  ])
  return {
    readings: sums._sum.readings ?? 0,
    prayers: sums._sum.prayers ?? 0,
    meditationSeconds: sums._sum.meditationSeconds ?? 0,
    prayerSeconds: sums._sum.prayerSeconds ?? 0,
    activeDays,
  }
}

function isActive(entry: ActivityEntry): boolean {
  return (
    entry.readings > 0 ||
    entry.prayers > 0 ||
    entry.meditationSeconds > 0 ||
    entry.prayerSeconds > 0
  )
}
