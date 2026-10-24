import "server-only"

import { getTranslations } from "next-intl/server"

import {
  achievementProgress,
  addDays,
  defaultLocale,
  levelCount,
  localeSchema,
  trophyKeys,
  evaluateAchievements,
  getToday,
  isBookId,
  type AchievementHistory,
  type IsoDate,
  type AchievementKey,
  type AchievementProgress,
  type UnlockedAchievement,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

import { createNotification } from "@/server/services/notifications"

export type AchievementsDb = Pick<
  PrismaClient,
  | "achievement"
  | "readingProgress"
  | "prayerLog"
  | "meditationSession"
  | "meditationNote"
  | "planEnrollment"
  | "notification"
>

/** A calendar date as stored in a DATE column (midnight UTC). */
function dateOnly(day: IsoDate): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

/**
 * Everything a person did, as the calendar days of their own time zone, ready
 * for `evaluateAchievements`. Readings count from the plans (what was ticked),
 * not from the free reader.
 */
export async function loadAchievementHistory(
  db: AchievementsDb,
  userId: string,
  timeZone: string | null
): Promise<AchievementHistory> {
  const dayOf = (date: Date) => getToday(timeZone, date)

  const [progress, prayerLogs, sessions, notes, enrollments] =
    await Promise.all([
      db.readingProgress.findMany({
        where: { enrollment: { userId } },
        select: {
          completedAt: true,
          reading: {
            select: {
              book: true,
              startChapter: true,
              startVerse: true,
              endChapter: true,
              endVerse: true,
            },
          },
        },
      }),
      db.prayerLog.findMany({ where: { userId }, select: { prayedAt: true } }),
      db.meditationSession.findMany({
        where: { userId },
        select: {
          kind: true,
          startedAt: true,
          plannedSeconds: true,
          durationSeconds: true,
        },
      }),
      db.meditationNote.findMany({
        where: { userId },
        select: { createdAt: true },
      }),
      db.planEnrollment.findMany({
        where: { userId },
        select: {
          plan: { select: { totalReadings: true } },
          progress: { select: { completedAt: true } },
        },
      }),
    ])

  const readings: AchievementHistory["readings"] = progress.flatMap(
    ({ completedAt, reading: r }) =>
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
  )

  // A time of prayer counts as a prayer, like in the activity record.
  const prayerSessions = sessions.filter((s) => s.kind === "PRAYER")

  return {
    readings,
    prayers: [
      ...prayerLogs.map((log) => dayOf(log.prayedAt)),
      ...prayerSessions.map((s) => dayOf(s.startedAt)),
    ],
    meditations: sessions
      .filter((s) => s.kind === "MEDITATION")
      .map((s) => dayOf(s.startedAt)),
    // Carried to its end: the whole planned time was spent.
    prayerTimes: prayerSessions
      .filter((s) => s.durationSeconds >= s.plannedSeconds)
      .map((s) => dayOf(s.startedAt)),
    notes: notes.map((note) => dayOf(note.createdAt)),
    completedPlans: enrollments
      .filter(
        (e) =>
          e.plan.totalReadings > 0 && e.progress.length >= e.plan.totalReadings
      )
      .map((e) =>
        dayOf(
          e.progress.reduce(
            (latest, p) => (p.completedAt > latest ? p.completedAt : latest),
            e.progress[0]!.completedAt
          )
        )
      ),
  }
}

/** Earned today or yesterday: worth a celebration and a notification. */
function isRecent(day: IsoDate, today: IsoDate): boolean {
  return day >= addDays(today, -1)
}

/** At most this many notifications for one action (never a burst). */
const maxNotifications = 3

/** Tells the person about what they just earned, in their language. */
async function notifyAchievements(
  db: AchievementsDb,
  userId: string,
  locale: string,
  timeZone: string | null,
  fresh: readonly UnlockedAchievement[]
): Promise<void> {
  const today = getToday(timeZone)
  const recent = fresh
    .filter((a) => isRecent(a.unlockedAt, today))
    .slice(0, maxNotifications)
  if (recent.length === 0) return

  const t = await getTranslations({
    locale: localeSchema.catch(defaultLocale).parse(locale),
    namespace: "Achievements",
  })
  for (const a of recent) {
    const name = t(`items.${a.key}.name`)
    const isTrophy = (trophyKeys as readonly string[]).includes(a.key)
    const levels = levelCount(a.key)
    await createNotification(db, {
      userId,
      type: "ACHIEVEMENT",
      title: isTrophy
        ? t("notification.trophy", { name })
        : t("notification.badge", {
            name,
            level: levels > 1 ? t(`levels.${a.level}`) : "",
          }).trim(),
      href: "/achievements",
    })
  }
}

/**
 * Records the achievements earned and not yet recorded, and gives the new
 * ones. Nothing is ever removed: an achievement stays even if the activity
 * behind it is later undone. Safe to run again and again (also used to catch
 * up existing accounts).
 */
export async function syncAchievements(
  db: AchievementsDb,
  userId: string,
  timeZone: string | null,
  history?: AchievementHistory
): Promise<UnlockedAchievement[]> {
  const earned = evaluateAchievements(
    history ?? (await loadAchievementHistory(db, userId, timeZone))
  )
  if (earned.length === 0) return []

  const existing = await db.achievement.findMany({
    where: { userId },
    select: { key: true, level: true },
  })
  const known = new Set(existing.map((a) => `${a.key}:${a.level}`))
  const fresh = earned.filter((a) => !known.has(`${a.key}:${a.level}`))
  if (fresh.length === 0) return []

  // Celebrated only when earned just now; the ones caught up for an older
  // activity are recorded as already seen.
  const today = getToday(timeZone)
  const now = new Date()
  await db.achievement.createMany({
    data: fresh.map((a) => ({
      userId,
      key: a.key,
      level: a.level,
      unlockedAt: dateOnly(a.unlockedAt),
      seenAt: isRecent(a.unlockedAt, today) ? null : now,
    })),
    skipDuplicates: true,
  })
  return fresh
}

/**
 * Same as `syncAchievements` for use right after an action: the action is
 * already saved, so a failure here is logged and costs nothing but a delay.
 */
export async function syncAchievementsQuietly(
  db: AchievementsDb,
  user: { id: string; timezone?: string | null; locale: string }
): Promise<UnlockedAchievement[]> {
  const timeZone = user.timezone ?? null
  try {
    const fresh = await syncAchievements(db, user.id, timeZone)
    await notifyAchievements(db, user.id, user.locale, timeZone, fresh)
    return fresh
  } catch (error) {
    console.error("Updating achievements failed", error)
    return []
  }
}

/** The achievements earned, newest first. */
export async function listAchievements(db: AchievementsDb, userId: string) {
  const rows = await db.achievement.findMany({
    where: { userId },
    orderBy: [{ unlockedAt: "desc" }, { createdAt: "desc" }],
    select: { key: true, level: true, unlockedAt: true },
  })
  return rows.map((row) => ({
    key: row.key,
    level: row.level,
    unlockedAt: row.unlockedAt.toISOString().slice(0, 10) as IsoDate,
  }))
}

/**
 * What the achievements page shows: the achievements earned (catching up the
 * ones not yet recorded, which is how accounts older than the feature get
 * theirs) and where the person stands for each.
 */
export async function getAchievementsOverview(
  db: AchievementsDb,
  userId: string,
  timeZone: string | null
) {
  const history = await loadAchievementHistory(db, userId, timeZone)
  await syncAchievements(db, userId, timeZone, history).catch((error) =>
    console.error("Updating achievements failed", error)
  )
  const earned = await listAchievements(db, userId)
  const progress: Record<AchievementKey, AchievementProgress> =
    achievementProgress(history, getToday(timeZone))
  return { earned, progress }
}
