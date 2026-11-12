import { BookOpen } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import type { BibleVersionId } from "@workspace/bible-data"
import {
  findVerseOfTheDay,
  formatPassage,
  getToday,
  type Locale,
  toPassageSlug,
} from "@workspace/core"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { PassageText } from "@/components/reader/passage-text"
import { VerseCard } from "@/components/reader/verse-card"
import { Link } from "@/i18n/navigation"

/**
 * The verse of the day, in the version the reader uses. Nothing is shown when
 * no verse has been chosen yet. `timeZone` is the user's, when known.
 */
export async function VerseOfTheDay({
  version,
  timeZone,
}: {
  version: BibleVersionId
  timeZone?: string | null
}) {
  const locale = (await getLocale()) as Locale
  const passage = findVerseOfTheDay(getToday(timeZone), locale)
  if (!passage) return null

  const t = await getTranslations("VerseOfTheDay")

  return (
    <VerseCard title={t("title")} timeZone={timeZone}>
      <blockquote className="relative">
        <span
          aria-hidden
          className="block h-7 font-heading text-6xl leading-none opacity-30 select-none"
        >
          “
        </span>
        <PassageText
          passage={passage}
          version={version}
          showVerseNumbers={false}
          className="text-xl text-pretty sm:text-2xl [&_p]:leading-normal"
        />
      </blockquote>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-3 font-heading font-semibold">
          <span aria-hidden className="h-px w-6 bg-current opacity-50" />
          {formatPassage(passage, locale)}
        </p>
        <Link
          href={`/read/${toPassageSlug(passage)}?v=${version}`}
          className={cn(
            buttonVariants(),
            "h-9 rounded-full px-4 group-data-[period=day]:bg-brand-night group-data-[period=day]:text-brand-cream group-data-[period=morning]:bg-brand-night group-data-[period=morning]:text-brand-cream group-data-[period=night]:bg-brand-gold group-data-[period=night]:text-brand-night group-data-[period=day]:hover:bg-brand-night-soft group-data-[period=morning]:hover:bg-brand-night-soft group-data-[period=night]:hover:bg-brand-gold-soft"
          )}
        >
          <BookOpen />
          {t("read")}
        </Link>
      </div>
    </VerseCard>
  )
}
