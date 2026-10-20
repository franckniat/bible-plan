import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import {
  addDays,
  buildHeatmap,
  computeStreak,
  getToday,
  type IsoDate,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { Heatmap } from "@/components/stats/heatmap"
import { StreakBadge } from "@/components/stats/streak-badge"
import { routing } from "@/i18n/routing"
import {
  activityTotals,
  listActiveDays,
  listActivity,
} from "@/server/services/activity"
import { requireUser } from "@/server/session"

/** About six months, in weeks. */
const heatmapWeeks = 26

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/stats">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Stats" })
  return { title: `${t("title")} · Bible Plan` }
}

/** Streaks, totals and the activity of the last months. */
export default async function StatsPage() {
  const user = await requireUser()
  const t = await getTranslations("Stats")
  const today = getToday(user.timezone)

  const weeks = buildHeatmap(new Map(), today, heatmapWeeks)
  const from = weeks[0]![0]!.date
  const [entries, activeDays, totals] = await Promise.all([
    listActivity(prisma, user.id, from, today),
    listActiveDays(prisma, user.id),
    activityTotals(prisma, user.id),
  ])
  const byDay = new Map(entries.map((entry) => [entry.day, entry]))
  const streak = computeStreak(activeDays, today)

  const details = new Map<IsoDate, string>(
    entries.map((entry) => [
      entry.day,
      t("heatmap.day", {
        readings: entry.readings,
        prayers: entry.prayers,
        minutes: Math.round(entry.meditationSeconds / 60),
      }),
    ])
  )
  const last30 = entries.filter((entry) => entry.day > addDays(today, -30))

  const cards: { label: string; value: string }[] = [
    {
      label: t("totals.prayerTime"),
      value: t("totals.minutes", {
        count: Math.round(totals.prayerSeconds / 60),
      }),
    },
    { label: t("totals.longest"), value: t("streak.days", { count: streak.longest }) },
    { label: t("totals.activeDays"), value: String(totals.activeDays) },
    { label: t("totals.readings"), value: String(totals.readings) },
    { label: t("totals.prayers"), value: String(totals.prayers) },
    {
      label: t("totals.meditation"),
      value: t("totals.minutes", {
        count: Math.round(totals.meditationSeconds / 60),
      }),
    },
    { label: t("totals.last30"), value: t("totals.daysCount", { count: last30.length }) },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <StreakBadge streak={streak} />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <li key={card.label}>
            <Card size="sm" className="h-full">
              <CardHeader>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {card.value}
                </CardTitle>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {t("heatmap.title")}
        </h2>
        <Heatmap
          weeks={buildHeatmap(byDay, today, heatmapWeeks)}
          details={details}
        />
        <p className="text-sm text-muted-foreground">
          {t("heatmap.legend")}
        </p>
      </section>
    </div>
  )
}
