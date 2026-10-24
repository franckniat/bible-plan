import { bookIds, type BookId } from "../bible/books"
import { chapterSteps, type Passage } from "../bible/passage"
import { getChapterCount, getVerseCount } from "../bible/verse-counts"
import { computeStreak } from "../activity/streak"
import { addDays, daysBetween } from "../plans/dates"
import type { IsoDate } from "../schemas/common"
import {
  badges,
  regularityDays,
  regularityWindow,
  trophyBooks,
  type AchievementKey,
  type AchievementLevel,
  type BadgeMetric,
} from "./catalogue"

/**
 * What a person did, as calendar dates in their own time zone (the caller
 * converts). Each list holds one entry per event, in any order.
 */
export type AchievementHistory = {
  /** A reading ticked in a plan, with the passage it covers. */
  readings: readonly { day: IsoDate; passage: Passage }[]
  /** A prayer said (one entry per prayer). */
  prayers: readonly IsoDate[]
  /** A meditation session finished. */
  meditations: readonly IsoDate[]
  /** A prayer time (timer) carried to its end. */
  prayerTimes: readonly IsoDate[]
  /** A meditation note written. */
  notes: readonly IsoDate[]
  /** The day a plan was completed (every reading ticked). */
  completedPlans: readonly IsoDate[]
}

export type UnlockedAchievement = {
  key: AchievementKey
  level: AchievementLevel
  unlockedAt: IsoDate
}

/** The date of the `n`th event, or null when there are fewer than `n`. */
function nthDate(dates: readonly IsoDate[], n: number): IsoDate | null {
  if (dates.length < n) return null
  return [...dates].sort()[n - 1] ?? null
}

/** The first day each streak length is reached, over all the runs. */
function streakReached(
  activeDays: readonly IsoDate[],
  length: number
): IsoDate | null {
  const days = [...new Set(activeDays)].sort()
  let best: IsoDate | null = null
  let run = 0
  let previous: IsoDate | null = null
  for (const day of days) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1
    previous = day
    if (run === length && (best === null || day < best)) best = day
  }
  return best
}

/**
 * The first day when at least `regularityDays` distinct days were active
 * within the last `regularityWindow` days (a year of regularity, not
 * necessarily in a row).
 */
function regularityReached(activeDays: readonly IsoDate[]): IsoDate | null {
  const days = [...new Set(activeDays)].sort()
  let start = 0
  for (let end = 0; end < days.length; end++) {
    const windowStart = addDays(days[end]!, -(regularityWindow - 1))
    while (days[start]! < windowStart) start += 1
    if (end - start + 1 >= regularityDays) return days[end]!
  }
  return null
}

/** The day each book was completely read, from the passages ticked. */
function bookCompletions(
  readings: AchievementHistory["readings"]
): Map<BookId, IsoDate> {
  const covered = new Map<BookId, Map<number, Set<number>>>()
  const completed = new Map<BookId, IsoDate>()

  const ordered = [...readings].sort((a, b) => a.day.localeCompare(b.day))
  for (const { day, passage } of ordered) {
    const book = passage.book
    if (completed.has(book)) continue
    const chapters = covered.get(book) ?? new Map<number, Set<number>>()
    covered.set(book, chapters)

    for (const step of chapterSteps(passage)) {
      const chapter = step.start.chapter
      const verses = chapters.get(chapter) ?? new Set<number>()
      chapters.set(chapter, verses)
      for (let verse = step.start.verse; verse <= step.end.verse; verse++) {
        verses.add(verse)
      }
    }

    const whole = Array.from(
      { length: getChapterCount(book) },
      (_, index) => index + 1
    ).every(
      (chapter) => chapters.get(chapter)?.size === getVerseCount(book, chapter)
    )
    if (whole) completed.set(book, day)
  }
  return completed
}

/** The day the last of `needed` books was completed, or null. */
function allCompleted(
  completions: Map<BookId, IsoDate>,
  needed: readonly BookId[]
): IsoDate | null {
  let latest: IsoDate | null = null
  for (const book of needed) {
    const day = completions.get(book)
    if (!day) return null
    if (latest === null || day > latest) latest = day
  }
  return latest
}

/**
 * Every badge level and trophy earned so far, with the day it was earned.
 * Pure and deterministic: the same history gives the same result, and more
 * events never remove anything (an achievement, once earned, stays).
 */
export function evaluateAchievements(
  history: AchievementHistory
): UnlockedAchievement[] {
  const completions = bookCompletions(history.readings)
  const activeDays = [
    ...history.readings.map((reading) => reading.day),
    ...history.prayers,
    ...history.meditations,
    ...history.prayerTimes,
  ]

  const reached: Record<BadgeMetric, (n: number) => IsoDate | null> = {
    firstReading: (n) => nthDate(history.readings.map((r) => r.day), n),
    firstPrayer: (n) => nthDate(history.prayers, n),
    firstMeditation: (n) => nthDate(history.meditations, n),
    streak: (n) => streakReached(activeDays, n),
    prayers: (n) => nthDate(history.prayers, n),
    meditations: (n) => nthDate(history.meditations, n),
    prayerTimes: (n) => nthDate(history.prayerTimes, n),
    books: (n) => nthDate([...completions.values()], n),
    notes: (n) => nthDate(history.notes, n),
  }

  const unlocked: UnlockedAchievement[] = []
  for (const badge of badges) {
    badge.thresholds.forEach((threshold, index) => {
      const unlockedAt = reached[badge.metric](threshold)
      if (unlockedAt) {
        unlocked.push({
          key: badge.key,
          level: (index + 1) as AchievementLevel,
          unlockedAt,
        })
      }
    })
  }

  const trophy = (key: AchievementKey, unlockedAt: IsoDate | null) => {
    if (unlockedAt) unlocked.push({ key, level: 1, unlockedAt })
  }
  trophy("plan-completed", nthDate(history.completedPlans, 1))
  for (const key of ["psalms", "gospels", "new-testament", "bible"] as const) {
    trophy(key, allCompleted(completions, trophyBooks[key](bookIds)))
  }
  trophy("regularity-year", regularityReached(activeDays))

  return unlocked
}

export type AchievementProgress = {
  /** Where the person stands now (current streak, count, books read…). */
  value: number
  /** What a trophy asks for; null for a badge (see its thresholds). */
  target: number | null
}

/**
 * Where a person stands for every achievement, to show how far the next
 * level is. `value` is the present situation (a streak that broke starts
 * again from zero), while what was earned stays in the unlocked list.
 */
export function achievementProgress(
  history: AchievementHistory,
  today: IsoDate
): Record<AchievementKey, AchievementProgress> {
  const completions = bookCompletions(history.readings)
  const activeDays = [
    ...history.readings.map((reading) => reading.day),
    ...history.prayers,
    ...history.meditations,
    ...history.prayerTimes,
  ]
  const metric: Record<BadgeMetric, number> = {
    firstReading: history.readings.length,
    firstPrayer: history.prayers.length,
    firstMeditation: history.meditations.length,
    streak: computeStreak(activeDays, today).current,
    prayers: history.prayers.length,
    meditations: history.meditations.length,
    prayerTimes: history.prayerTimes.length,
    books: completions.size,
    notes: history.notes.length,
  }

  const progress = {} as Record<AchievementKey, AchievementProgress>
  for (const badge of badges) {
    progress[badge.key] = { value: metric[badge.metric], target: null }
  }

  const windowStart = addDays(today, -(regularityWindow - 1))
  const inWindow = new Set(
    activeDays.filter((day) => day >= windowStart && day <= today)
  )
  progress["plan-completed"] = {
    value: Math.min(history.completedPlans.length, 1),
    target: 1,
  }
  for (const key of ["psalms", "gospels", "new-testament", "bible"] as const) {
    const needed = trophyBooks[key](bookIds)
    progress[key] = {
      value: needed.filter((book) => completions.has(book)).length,
      target: needed.length,
    }
  }
  progress["regularity-year"] = {
    value: Math.min(inWindow.size, regularityDays),
    target: regularityDays,
  }
  return progress
}
