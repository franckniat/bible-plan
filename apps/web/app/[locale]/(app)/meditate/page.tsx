import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { getToday, toPassageSlug } from "@workspace/core"
import { prisma } from "@workspace/db"

import { MeditationFlow } from "@/components/meditation/meditation-flow"
import { routing } from "@/i18n/routing"
import { getTodayPlans } from "@/server/services/plans"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/meditate">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Meditate" })
  return { title: `${t("title")} · Bible Plan` }
}

/** A timed session of meditation, with the passage of the day to dwell on. */
export default async function MeditatePage() {
  const user = await requireUser()
  const t = await getTranslations("Meditate")
  const plans = await getTodayPlans(prisma, user.id, getToday(user.timezone))
  // The first reading of today in the first plan that has one.
  const reading = plans.find((plan) => plan.isToday && plan.day)?.day
    ?.readings[0]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>
      <MeditationFlow
        todayPassage={reading ? toPassageSlug(reading.passage) : null}
      />
    </div>
  )
}
