import type { BookId } from "../bible/books"

/**
 * Level of an achievement: 1 bronze, 2 silver, 3 gold. A trophy has a single
 * level (1). Stored as a number so that "silver" is never a string to compare.
 */
export type AchievementLevel = 1 | 2 | 3

/**
 * What a badge counts. Always days or sessions, never minutes or chapters:
 * the point is regularity, not volume.
 */
export type BadgeMetric =
  | "firstReading"
  | "firstPrayer"
  | "firstMeditation"
  | "streak"
  | "prayers"
  | "meditations"
  | "prayerTimes"
  | "books"
  | "notes"

/** Badges: the everyday collection, with levels. */
export const badges = [
  { key: "first-reading", metric: "firstReading", thresholds: [1] },
  { key: "first-prayer", metric: "firstPrayer", thresholds: [1] },
  { key: "first-meditation", metric: "firstMeditation", thresholds: [1] },
  { key: "fidelity", metric: "streak", thresholds: [7, 30, 100] },
  { key: "prayer", metric: "prayers", thresholds: [10, 50, 200] },
  { key: "meditation", metric: "meditations", thresholds: [10, 50, 200] },
  { key: "prayer-time", metric: "prayerTimes", thresholds: [7, 30, 100] },
  { key: "books", metric: "books", thresholds: [1, 10, 30] },
  { key: "notes", metric: "notes", thresholds: [10] },
] as const satisfies readonly {
  key: string
  metric: BadgeMetric
  thresholds: readonly number[]
}[]

export type BadgeKey = (typeof badges)[number]["key"]

/** Days of activity in a year (not necessarily in a row) for the regularity trophy. */
export const regularityDays = 300
export const regularityWindow = 365

const oldTestamentBooks = 39

/** Trophies: the rare, big accomplishments. */
export const trophyKeys = [
  "plan-completed",
  "psalms",
  "gospels",
  "new-testament",
  "bible",
  "regularity-year",
] as const

export type TrophyKey = (typeof trophyKeys)[number]

export type AchievementKey = BadgeKey | TrophyKey

/** The books to read in full to earn a book-based trophy. */
export const trophyBooks: Record<
  "psalms" | "gospels" | "new-testament" | "bible",
  (all: readonly BookId[]) => readonly BookId[]
> = {
  psalms: () => ["Ps"],
  gospels: () => ["Matt", "Mark", "Luke", "John"],
  "new-testament": (all) => all.slice(oldTestamentBooks),
  bible: (all) => all,
}

/** Number of levels of an achievement (1 for a trophy). */
export function levelCount(key: AchievementKey): number {
  const badge = badges.find((definition) => definition.key === key)
  return badge ? badge.thresholds.length : 1
}
