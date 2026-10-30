import {
  achievementProgress,
  addDays,
  evaluateAchievements,
  getToday,
  isBookId,
  type AchievementHistory,
  type AchievementKey,
  type AchievementProgress,
  type IsoDate,
  type UnlockedAchievement,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import { eq, inArray, isNull } from "drizzle-orm"

import { notifyChange, useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import {
  achievements,
  meditationNotes,
  meditationSessions,
  planEnrollments,
  planReadings,
  prayerLogs,
  readingPlans,
  readingProgress,
} from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced } from "./write"

export type Achievement = typeof achievements.$inferSelect

/** The tables whose changes can earn an achievement. */
export const achievementSources = [
  "readingProgress",
  "prayerLog",
  "meditationSession",
  "meditationNote",
]
const tables = ["achievement", ...achievementSources]

/**
 * What was done on the phone, as the web reads it for the achievements
 * (loadAchievementHistory), in the person's days.
 */
export function achievementHistory(
  db: Database,
  timeZone: string
): AchievementHistory {
  const dayOf = (at: string) => getToday(timeZone, new Date(at))
  const progress = db
    .select({
      completedAt: readingProgress.completedAt,
      enrollmentId: readingProgress.enrollmentId,
      reading: planReadings,
    })
    .from(readingProgress)
    .innerJoin(planReadings, eq(planReadings.id, readingProgress.readingId))
    .all()
  const sessions = db.select().from(meditationSessions).all()
  // A time of prayer counts as a prayer, like in the activity record.
  const prayerSessions = sessions.filter((s) => s.kind === "PRAYER")
  const enrollments = db
    .select({
      id: planEnrollments.id,
      totalReadings: readingPlans.totalReadings,
    })
    .from(planEnrollments)
    .innerJoin(readingPlans, eq(readingPlans.id, planEnrollments.planId))
    .all()

  return {
    readings: progress.flatMap(({ completedAt, reading: r }) =>
      isBookId(r.book)
        ? [
            {
              day: dayOf(completedAt),
              passage: {
                book: r.book,
                start: { chapter: r.startChapter, verse: r.startVerse },
                end: { chapter: r.endChapter, verse: r.endVerse },
              },
            },
          ]
        : []
    ),
    prayers: [
      ...db
        .select({ at: prayerLogs.prayedAt })
        .from(prayerLogs)
        .all()
        .map((log) => dayOf(log.at)),
      ...prayerSessions.map((s) => dayOf(s.startedAt)),
    ],
    meditations: sessions
      .filter((s) => s.kind === "MEDITATION")
      .map((s) => dayOf(s.startedAt)),
    // Carried to its end: the whole planned time was spent.
    prayerTimes: prayerSessions
      .filter((s) => s.durationSeconds >= s.plannedSeconds)
      .map((s) => dayOf(s.startedAt)),
    notes: db
      .select({ at: meditationNotes.updatedAt })
      .from(meditationNotes)
      .all()
      .map((note) => dayOf(note.at)),
    completedPlans: enrollments.flatMap((enrollment) => {
      const done = progress
        .filter((p) => p.enrollmentId === enrollment.id)
        .map((p) => p.completedAt)
      return enrollment.totalReadings > 0 &&
        done.length >= enrollment.totalReadings
        ? [dayOf(done.sort().at(-1)!)]
        : []
    }),
  }
}

/**
 * Evaluates the achievements on the phone (evaluateAchievements, as the web)
 * and stores those newly earned, through the outbox. Earned today or
 * yesterday, they are to celebrate; older ones (caught up) are already seen.
 * Gives the new ones. An achievement, once earned, stays.
 */
export function syncAchievements(
  db: Database,
  timeZone: string,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): UnlockedAchievement[] {
  const earned = evaluateAchievements(achievementHistory(db, timeZone))
  const known = new Set(
    db
      .select()
      .from(achievements)
      .all()
      .map((a) => `${a.key}:${a.level}`)
  )
  const fresh = earned.filter((a) => !known.has(`${a.key}:${a.level}`))
  if (fresh.length === 0) return []
  const today = getToday(timeZone, now)
  const at = now.toISOString()
  const records: SyncRecord<"achievement">[] = fresh.map((a) => ({
    id: id(),
    key: a.key,
    level: a.level,
    unlockedAt: a.unlockedAt,
    updatedAt: at,
  }))
  writeSynced(
    db,
    records.map((record) => ({
      table: "achievement" as const,
      op: "upsert" as const,
      record,
    })),
    (tx) => {
      for (const record of records) {
        tx.insert(achievements)
          .values({
            ...record,
            seenAt: record.unlockedAt >= addDays(today, -1) ? null : at,
          })
          .onConflictDoNothing()
          .run()
      }
    },
    now
  )
  return fresh
}

/** The achievements earned, the latest level of each. */
export function listAchievements(db: Database): Achievement[] {
  return db.select().from(achievements).all()
}

/** Where the person stands for each achievement. */
export function progressOf(
  db: Database,
  timeZone: string,
  today: IsoDate
): Record<AchievementKey, AchievementProgress> {
  return achievementProgress(achievementHistory(db, timeZone), today)
}

/** Earned and not celebrated yet on this phone. */
export function unseenAchievements(db: Database): Achievement[] {
  return db.select().from(achievements).where(isNull(achievements.seenAt)).all()
}

export function useAchievements(timeZone: string, today: IsoDate) {
  return useLocalQuery(
    tables,
    () => ({
      earned: listAchievements(getDatabase()),
      progress: progressOf(getDatabase(), timeZone, today),
    }),
    [timeZone, today]
  )
}

/** Evaluates the achievements again (after what can earn one). */
export function checkAchievements(timeZone: string): UnlockedAchievement[] {
  return syncAchievements(getDatabase(), timeZone)
}

/** Celebrated on this phone: not shown again (local, not synced). */
export function markSeen(db: Database, ids: string[], now: Date): void {
  if (ids.length === 0) return
  db.update(achievements)
    .set({ seenAt: now.toISOString() })
    .where(inArray(achievements.id, ids))
    .run()
  notifyChange("achievement")
}

/** Earned and still to celebrate, kept up to date. */
export function useUnseenAchievements(): Achievement[] {
  return useLocalQuery(["achievement"], () => unseenAchievements(getDatabase()))
}

/** Marks achievements as celebrated (for screens). */
export function celebrated(ids: string[]): void {
  markSeen(getDatabase(), ids, new Date())
}
