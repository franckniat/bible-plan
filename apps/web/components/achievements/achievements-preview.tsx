import { Medal } from "lucide-react"
import { getTranslations } from "next-intl/server"

import type { AchievementKey, AchievementLevel } from "@workspace/core"
import { trophyKeys } from "@workspace/core"
import { prisma } from "@workspace/db"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { AchievementMedal } from "@/components/achievements/achievement-medal"
import { Link } from "@/i18n/navigation"
import { listAchievements } from "@/server/services/achievements"

const latestShown = 4

/** The latest badges and trophies, on the profile, with a link to all. */
export async function AchievementsPreview({ userId }: { userId: string }) {
  const t = await getTranslations("Achievements")
  const earned = (await listAchievements(prisma, userId)).slice(0, latestShown)

  return (
    <div className="flex flex-col gap-4">
      {earned.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("preview.none")}</p>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {earned.map((item) => {
            const trophy = (trophyKeys as readonly string[]).includes(item.key)
            return (
              <li
                key={`${item.key}:${item.level}`}
                className="flex w-24 flex-col items-center gap-1.5 text-center"
              >
                <AchievementMedal
                  achievementKey={item.key as AchievementKey}
                  level={item.level as AchievementLevel}
                  trophy={trophy}
                  size="md"
                />
                <span className="text-xs leading-tight">
                  {t(`items.${item.key as AchievementKey}.name`)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <Link
        href="/achievements"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-11 w-fit sm:px-5"
        )}
      >
        <Medal />
        {t("preview.all")}
      </Link>
    </div>
  )
}
