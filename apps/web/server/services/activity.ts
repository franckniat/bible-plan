import "server-only"

import type { IsoDate } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type ActivityDb = Pick<PrismaClient, "activityDay">

/** What a person did on a day of their own calendar. */
export type ActivityDelta = {
  readings?: number
  prayers?: number
  meditationSeconds?: number
  prayerSeconds?: number
}

export type ActivityEntry = {
  day: IsoDate
  readings: number
  prayers: number
  meditationSeconds: number
  prayerSeconds: number
}

/** A calendar date as stored in a DATE column (midnight UTC). */
function dateOnly(day: IsoDate): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

/**
 * Adds to the activity of a day, creating it if needed. A negative number
 * takes back what was counted (a reading ticked off again) and never goes
 * under zero. Activity is a record of what happened, so a failure here must
 * not undo the reading, prayer or session that caused it: callers log it.
 */
export async function recordActivity(
  db: ActivityDb,
  userId: string,
  day: IsoDate,
  delta: ActivityDelta
): Promise<void> {
  const {
    readings = 0,
    prayers = 0,
    meditationSeconds = 0,
    prayerSeconds = 0,
  } = delta
  const where = { userId_day: { userId, day: dateOnly(day) } }

  if (
    readings > 0 ||
    prayers > 0 ||
    meditationSeconds > 0 ||
    prayerSeconds > 0
  ) {
    await db.activityDay.upsert({
      where,
      create: {
        userId,
        day: dateOnly(day),
        readings: Math.max(0, readings),
        prayers: Math.max(0, prayers),
        meditationSeconds: Math.max(0, meditationSeconds),
        prayerSeconds: Math.max(0, prayerSeconds),
      },
      update: {
        ...(readings > 0 ? { readings: { increment: readings } } : {}),
        ...(prayers > 0 ? { prayers: { increment: prayers } } : {}),
        ...(meditationSeconds > 0
          ? { meditationSeconds: { increment: meditationSeconds } }
          : {}),
        ...(prayerSeconds > 0
          ? { prayerSeconds: { increment: prayerSeconds } }
          : {}),
      },
    })
  }
  if (readings < 0) {
    await db.activityDay.updateMany({
      where: { userId, day: dateOnly(day), readings: { gt: 0 } },
      data: { readings: { decrement: Math.min(-readings, 1) } },
    })
  }
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
