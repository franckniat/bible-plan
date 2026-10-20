import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import {
  getToday,
  prayerCategories,
  prayerStatuses,
  type PrayerCategory,
  type PrayerStatus,
} from "@workspace/core"
import { prisma } from "@workspace/db"
import { buttonVariants } from "@workspace/ui/components/button"
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
    // Calendar dates: read at midnight UTC, so they never move with a zone.
    startedOn: prayer.startedOn.toISOString().slice(0, 10),
    passages: prayer.passages,
    prayerCount: prayer.prayerCount,
    lastPrayed: prayer.lastPrayedAt
      ? formatDate.format(prayer.lastPrayedAt)
      : null,
    answeredOn: prayer.answeredOn
      ? prayer.answeredOn.toISOString().slice(0, 10)
      : null,
    answerNote: prayer.answerNote,
  }))
  const total = counts.ACTIVE + counts.ANSWERED + counts.ARCHIVED

  // The filters are links (they change the address), dressed like buttons.
  const chip = (selected: boolean) =>
    cn(
      buttonVariants({
        variant: selected ? "default" : "outline",
        size: "sm",
      }),
      "rounded-full"
    )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
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

      <PrayerJournal
        prayers={views}
        status={status}
        total={total}
        today={getToday(user.timezone)}
      />
    </div>
  )
}
