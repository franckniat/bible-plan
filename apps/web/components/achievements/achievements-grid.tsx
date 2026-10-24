import { getFormatter, getTranslations } from "next-intl/server"

import {
  badges,
  levelCount,
  trophyKeys,
  type AchievementKey,
  type AchievementLevel,
  type AchievementProgress,
} from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

import { AchievementMedal } from "@/components/achievements/achievement-medal"

type Earned = { key: string; level: number; unlockedAt: string }

/** Highest level earned for each key, with the day it was earned. */
function bestLevels(earned: readonly Earned[]) {
  const best = new Map<string, { level: number; unlockedAt: string }>()
  for (const item of earned) {
    const current = best.get(item.key)
    if (!current || item.level > current.level) {
      best.set(item.key, { level: item.level, unlockedAt: item.unlockedAt })
    }
  }
  return best
}

function ProgressBar({
  value,
  target,
  label,
}: {
  value: number
  target: number
  label: string
}) {
  const percent = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-brand-night/10 dark:bg-white/15"
      >
        <div
          className="h-full rounded-full bg-brand-gold"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {label}
      </span>
    </div>
  )
}

/** Badges with levels first: the single "first time" ones come last. */
const sortedBadges = [...badges].sort(
  (a, b) =>
    Number(a.thresholds.length === 1) - Number(b.thresholds.length === 1)
)

/** Badges and trophies: what is earned, and how far the next level is. */
export async function AchievementsGrid({
  earned,
  progress,
}: {
  earned: readonly Earned[]
  progress: Record<AchievementKey, AchievementProgress>
}) {
  const t = await getTranslations("Achievements")
  const format = await getFormatter()
  const best = bestLevels(earned)

  const card =
    "flex gap-4 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="badges-title" className="flex flex-col gap-4">
        <h2 id="badges-title" className="font-heading text-xl font-semibold">
          {t("badges")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {sortedBadges.map((badge) => {
            const thresholds: readonly number[] = badge.thresholds
            const got = best.get(badge.key)
            const level = (got?.level ?? 0) as 0 | AchievementLevel
            const levels = levelCount(badge.key)
            const next = level < levels ? thresholds[level] : undefined
            const shown = Math.min(level + 1, levels) as AchievementLevel
            const description = t(`items.${badge.key}.description`, {
              count: thresholds[Math.max(0, shown - 1)] ?? 0,
            })
            const value = progress[badge.key].value
            return (
              <li key={badge.key} className={card}>
                <AchievementMedal
                  achievementKey={badge.key}
                  level={(level || 1) as AchievementLevel}
                  locked={level === 0}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h3 className="font-medium">
                    {t(`items.${badge.key}.name`)}
                    {level > 0 && levels > 1 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {t(`levels.${level as AchievementLevel}`)}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {level === levels && levels > 1
                      ? t("complete")
                      : description}
                  </p>
                  {next !== undefined && (
                    <ProgressBar
                      value={value}
                      target={next}
                      label={t("progress", {
                        value: Math.min(value, next),
                        target: next,
                      })}
                    />
                  )}
                  {got && (
                    <p className={cn("text-xs text-muted-foreground")}>
                      {t("earnedOn", {
                        date: format.dateTime(new Date(got.unlockedAt), {
                          dateStyle: "long",
                          timeZone: "UTC",
                        }),
                      })}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="trophies-title" className="flex flex-col gap-4">
        <h2 id="trophies-title" className="font-heading text-xl font-semibold">
          {t("trophies")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {trophyKeys.map((key) => {
            const got = best.get(key)
            const { value, target } = progress[key]
            return (
              <li key={key} className={card}>
                <AchievementMedal
                  achievementKey={key}
                  level={1}
                  trophy
                  locked={!got}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h3 className="font-medium">{t(`items.${key}.name`)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`items.${key}.description`)}
                  </p>
                  {got ? (
                    <p className="text-xs text-muted-foreground">
                      {t("earnedOn", {
                        date: format.dateTime(new Date(got.unlockedAt), {
                          dateStyle: "long",
                          timeZone: "UTC",
                        }),
                      })}
                    </p>
                  ) : (
                    target !== null &&
                    target > 1 && (
                      <ProgressBar
                        value={value}
                        target={target}
                        label={t("progress", { value, target })}
                      />
                    )
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
