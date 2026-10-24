import { getTranslations } from "next-intl/server"

import {
  levelCount,
  trophyKeys,
  type AchievementKey,
  type AchievementLevel,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { CelebrationDialog } from "@/components/achievements/celebration-dialog"

const shown = 3

/**
 * The celebration of what was just earned and not yet seen: a short dialog on
 * the next page the person opens. Nothing is rendered the rest of the time.
 */
export async function AchievementCelebration({ userId }: { userId: string }) {
  const unseen = await prisma.achievement.findMany({
    where: { userId, seenAt: null },
    orderBy: { createdAt: "asc" },
    take: shown,
    select: { key: true, level: true },
  })
  if (unseen.length === 0) return null

  const t = await getTranslations("Achievements")
  const items = unseen.map(({ key, level }) => {
    const trophy = (trophyKeys as readonly string[]).includes(key)
    const name = t(`items.${key as AchievementKey}.name`)
    return {
      key: key as AchievementKey,
      level: level as AchievementLevel,
      trophy,
      name,
      label: trophy
        ? t("levels.trophy")
        : levelCount(key as AchievementKey) > 1
          ? t(`levels.${level as AchievementLevel}`)
          : "",
      shareText: t("celebrate.shareText", { name }),
    }
  })

  return <CelebrationDialog items={items} />
}
