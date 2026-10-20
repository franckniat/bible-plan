import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { prayerMinutes } from "@workspace/core"

import { SessionFlow } from "@/components/session/session-flow"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/prayer/timer">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "PrayerTimer" })
  return { title: `${t("title")} · Bible Plan` }
}

/** A timed time of prayer: an hour, say, and a sound when it ends. */
export default async function PrayerTimerPage() {
  await requireUser()
  const t = await getTranslations("PrayerTimer")

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/prayer"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      <SessionFlow
        kind="PRAYER"
        minutes={prayerMinutes}
        defaultMinutes={60}
        todayPassage={null}
      />
    </div>
  )
}
