import { getFormatter, getTranslations } from "next-intl/server"

import {
  badges,
  levelCount,
  trophyKeys,
  type AchievementKey,
  type AchievementLevel,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { renderAchievementCard } from "@/lib/achievement-card"
import { getSession } from "@/server/session"

export const dynamic = "force-dynamic"

const keys = new Set<string>([...badges.map((b) => b.key), ...trophyKeys])

/**
 * The shareable picture of an achievement the signed-in person has earned.
 * Private: it is only built for its owner, who decides whether to share it.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const key = params.get("key") ?? ""
  const level = Number(params.get("level") ?? 1)
  if (
    !keys.has(key) ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > levelCount(key as AchievementKey)
  ) {
    return Response.json({ error: "invalid" }, { status: 400 })
  }

  const earned = await prisma.achievement.findUnique({
    where: { userId_key_level: { userId: session.user.id, key, level } },
    select: { unlockedAt: true },
  })
  if (!earned) return Response.json({ error: "not_found" }, { status: 404 })

  const locale = session.user.locale === "en" ? "en" : "fr"
  const t = await getTranslations({ locale, namespace: "Achievements" })
  const format = await getFormatter({ locale })
  const trophy = (trophyKeys as readonly string[]).includes(key)
  const badge = badges.find((b) => b.key === key)
  const thresholds: readonly number[] = badge?.thresholds ?? []

  const response = renderAchievementCard({
    name: t(`items.${key as AchievementKey}.name`),
    description: t(`items.${key as AchievementKey}.description`, {
      count: thresholds[level - 1] ?? 0,
    }),
    levelLabel: trophy
      ? t("levels.trophy")
      : levelCount(key as AchievementKey) > 1
        ? t(`levels.${level as AchievementLevel}`)
        : "",
    level: level as AchievementLevel,
    trophy,
    date: format.dateTime(earned.unlockedAt, {
      dateStyle: "long",
      timeZone: "UTC",
    }),
  })
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
