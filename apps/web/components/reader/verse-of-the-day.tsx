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
    <VerseCard timeZone={timeZone}>
      <h2
        id="verse-of-the-day"
        className="text-sm font-semibold tracking-wide uppercase opacity-70"
      >
        {t("title")}
      </h2>
      <PassageText
        passage={passage}
        version={version}
        showVerseNumbers={false}
        className="text-lg"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-heading font-semibold">
          {formatPassage(passage, locale)}
        </p>
        <Link
          href={`/read/${toPassageSlug(passage)}?v=${version}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-9 border-transparent bg-white/70 text-brand-night group-data-[period=night]:bg-white/15 group-data-[period=night]:text-brand-cream hover:bg-white group-data-[period=night]:hover:bg-white/25"
          )}
        >
          <BookOpen />
          {t("read")}
        </Link>
      </div>
    </VerseCard>
  )
}
