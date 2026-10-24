import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { prisma } from "@workspace/db"

import { AchievementsGrid } from "@/components/achievements/achievements-grid"
import { routing } from "@/i18n/routing"
import { getAchievementsOverview } from "@/server/services/achievements"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/achievements">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Achievements" })
  return { title: `${t("title")} · Bible Plan` }
}

/** The badges and trophies of the signed-in person (private). */
export default async function AchievementsPage() {
  const user = await requireUser()
  const t = await getTranslations("Achievements")
  const { earned, progress } = await getAchievementsOverview(
    prisma,
    user.id,
    user.timezone ?? null
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <p className="text-sm text-muted-foreground">
          {t("count", { count: earned.length })}
        </p>
      </div>
      {earned.length === 0 && (
        <p className="rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm">
          {t("empty")}
        </p>
      )}
      <AchievementsGrid earned={earned} progress={progress} />
    </div>
  )
}
