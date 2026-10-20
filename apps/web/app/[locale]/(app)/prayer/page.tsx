import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import {
  prayerCategories,
  prayerStatuses,
  type PrayerCategory,
  type PrayerStatus,
} from "@workspace/core"
import { prisma } from "@workspace/db"
import { cn } from "@workspace/ui/lib/utils"

import {
  PrayerJournal,
  type PrayerView,
} from "@/components/prayer/prayer-journal"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { countPrayers, listPrayers } from "@/server/services/prayers"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/prayer">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Prayer" })
  return { title: `${t("title")} · Bible Plan` }
}

function pick<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T | undefined {
  return allowed.find((candidate) => candidate === value)
}

/** The prayer journal: what the person prays for, and what was answered. */
export default async function PrayerPage({
  searchParams,
}: PageProps<"/[locale]/prayer">) {
  const user = await requireUser()
  const query = await searchParams
  const status: PrayerStatus = pick(query.status, prayerStatuses) ?? "ACTIVE"
  const category: PrayerCategory | undefined = pick(
    query.category,
    prayerCategories
  )

  const t = await getTranslations("Prayer")
  const locale = await getLocale()
  const [prayers, counts] = await Promise.all([
    listPrayers(prisma, user.id, status, category),
    countPrayers(prisma, user.id),
  ])
  // In the day of the user, like the rest of the app.
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: user.timezone || "UTC",
  })
  const views: PrayerView[] = prayers.map((prayer) => ({
    id: prayer.id,
    title: prayer.title,
    details: prayer.details,
    category: prayer.category,
    status: prayer.status,
    prayerCount: prayer.prayerCount,
    lastPrayed: prayer.lastPrayedAt
      ? formatDate.format(prayer.lastPrayedAt)
      : null,
    answered: prayer.answeredAt ? formatDate.format(prayer.answeredAt) : null,
    answerNote: prayer.answerNote,
  }))
  const total = counts.ACTIVE + counts.ANSWERED + counts.ARCHIVED

  const chip = (selected: boolean) =>
    cn(
      "rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand-gold",
      selected
        ? "bg-brand-night text-brand-cream ring-brand-night dark:bg-brand-gold dark:text-neutral-950 dark:ring-brand-gold"
        : "ring-brand-night/15 hover:bg-brand-gold/10 dark:ring-white/20"
    )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>

      <nav aria-label={t("filters.status")} className="flex flex-wrap gap-2">
        {prayerStatuses.map((value) => (
          <Link
            key={value}
            href={{
              pathname: "/prayer",
              query: {
                status: value,
                ...(category ? { category } : {}),
              },
            }}
            aria-current={value === status ? "page" : undefined}
            className={chip(value === status)}
          >
            {t(`statuses.${value}`)} · {counts[value]}
          </Link>
        ))}
      </nav>

      <nav aria-label={t("filters.category")} className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: "/prayer", query: { status } }}
          aria-current={category === undefined ? "page" : undefined}
          className={chip(category === undefined)}
        >
          {t("filters.all")}
        </Link>
        {prayerCategories.map((value) => (
          <Link
            key={value}
            href={{ pathname: "/prayer", query: { status, category: value } }}
            aria-current={value === category ? "page" : undefined}
            className={chip(value === category)}
          >
            {t(`categories.${value}`)}
          </Link>
        ))}
      </nav>

      <PrayerJournal prayers={views} status={status} total={total} />
    </div>
  )
}
