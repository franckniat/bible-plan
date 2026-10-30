import {
  badges,
  type AchievementKey,
  type AchievementProgress,
} from "@workspace/core"

import type { Achievement } from "@/repositories/achievements"

/** An achievement as the collection shows it. */
export type AchievementView = {
  key: AchievementKey
  trophy: boolean
  /** The highest level earned (0: none yet). */
  level: number
  levels: number
  /** When each level was earned, by level. */
  earned: Record<number, string>
  /** For the description: the next level's threshold, or the last one. */
  count: number
  /** Toward the next level; null once all are earned. */
  next: { value: number; target: number } | null
}

/** The collection: badges then trophies, from what was earned and the progress. */
export function achievementViews(
  earned: readonly Achievement[],
  progress: Record<AchievementKey, AchievementProgress>,
  trophyKeys: readonly AchievementKey[]
): AchievementView[] {
  const earnedOf = (key: AchievementKey) =>
    Object.fromEntries(
      earned
        .filter((achievement) => achievement.key === key)
        .map((achievement) => [achievement.level, achievement.unlockedAt])
    ) as Record<number, string>

  const badgeViews = badges.map((badge): AchievementView => {
    const levels = earnedOf(badge.key)
    const level = Math.max(0, ...Object.keys(levels).map(Number))
    const threshold = badge.thresholds[level] ?? null
    return {
      key: badge.key,
      trophy: false,
      level,
      levels: badge.thresholds.length,
      earned: levels,
      count: threshold ?? badge.thresholds.at(-1)!,
      next:
        threshold === null
          ? null
          : {
              value: Math.min(progress[badge.key].value, threshold),
              target: threshold,
            },
    }
  })
  const trophyViews = trophyKeys.map((key): AchievementView => {
    const levels = earnedOf(key)
    const { value, target } = progress[key]
    const done = Boolean(levels[1])
    return {
      key,
      trophy: true,
      level: done ? 1 : 0,
      levels: 1,
      earned: levels,
      count: target ?? 1,
      next: done ? null : { value, target: target ?? 1 },
    }
  })
  return [...badgeViews, ...trophyViews]
}
