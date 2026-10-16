"use client"

import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { formatPassage, parsePassageSlug, type Locale } from "@workspace/core"

import {
  historyHref,
  useReadingHistory,
} from "@/components/reader/reading-history"
import { Link } from "@/i18n/navigation"

const SHOWN = 6

/**
 * The places read lately on this device, plans and free reading mixed,
 * except the one the resume button already offers.
 */
export function RecentReadings() {
  const t = useTranslations("BibleIndex")
  const locale = useLocale() as Locale
  const history = useReadingHistory()
  const resumed = history.find((entry) => !entry.reading)
  const entries = history.filter((entry) => entry !== resumed).slice(0, SHOWN)
  if (entries.length === 0) return null

  return (
    <section aria-labelledby="recent-readings" className="flex flex-col gap-3">
      <h2 id="recent-readings" className="font-heading text-xl font-semibold">
        {t("recent")}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.reading?.id ?? entry.slug}>
            <Link
              href={historyHref(entry)}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-brand-night/10 outline-none hover:ring-brand-night/25 focus-visible:ring-3 focus-visible:ring-ring/40 dark:bg-neutral-900/85 dark:ring-white/10 dark:hover:ring-white/25"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {formatPassage(parsePassageSlug(entry.slug)!, locale)}
                </span>
                <span className="truncate text-sm text-brand-night/60 dark:text-neutral-100/60">
                  {entry.reading?.planTitle ?? t("freeReading")}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-brand-night/50 dark:text-neutral-100/50"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
