import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import {
  defaultBibleVersion,
  getBibleVersion,
  isBibleVersionId,
  youVersionUrl,
} from "@workspace/bible-data"
import {
  adjacentChapter,
  chaptersPassage,
  formatPassage,
  getBookName,
  parsePassageSlug,
  toPassageSlug,
  type Locale,
} from "@workspace/core"
import { prisma } from "@workspace/db"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { PassageText } from "@/components/reader/passage-text"
import { ReadingDone } from "@/components/reader/reading-done"
import { VersionSwitch } from "@/components/reader/version-switch"
import { Link } from "@/i18n/navigation"
import { getReadingForUser } from "@/server/services/plans"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/read/[passage]">): Promise<Metadata> {
  const { passage: slug } = await params
  const passage = parsePassageSlug(decodeURIComponent(slug))
  if (!passage) return {}
  const locale = (await getLocale()) as Locale
  return { title: `${formatPassage(passage, locale)} · Bible Plan` }
}

/** Reads a passage in the user's Bible version. */
export default async function ReadPage({
  params,
  searchParams,
}: PageProps<"/[locale]/read/[passage]">) {
  const { passage: slug } = await params
  const fromSlug = parsePassageSlug(decodeURIComponent(slug))
  if (!fromSlug) notFound()

  const user = await requireUser()
  // ?reading=<id>: a reading of one of the user's plans, to mark as read.
  const { reading: readingId } = await searchParams
  const reading =
    typeof readingId === "string"
      ? await getReadingForUser(prisma, user.id, readingId)
      : null
  const passage = reading?.passage ?? fromSlug
  const locale = (await getLocale()) as Locale
  const t = await getTranslations("Reader")
  const versionId = isBibleVersionId(user.bibleVersion)
    ? user.bibleVersion
    : defaultBibleVersion(locale)
  const version = getBibleVersion(versionId)

  const previous = adjacentChapter(passage.book, passage.start.chapter, -1)
  const next = adjacentChapter(passage.book, passage.end.chapter, 1)
  const chapterLink = (
    target: NonNullable<typeof previous>,
    direction: "previous" | "next"
  ) => {
    const label = `${getBookName(target.book, locale)} ${target.chapter}`
    return (
      <Link
        href={`/read/${toPassageSlug(chaptersPassage(target.book, target.chapter))}`}
        aria-label={t(direction, { chapter: label })}
        className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
      >
        {direction === "previous" && <ChevronLeft />}
        <span className="max-w-36 truncate">{label}</span>
        {direction === "next" && <ChevronRight />}
      </Link>
    )
  }

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">
          {formatPassage(passage, locale)}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <VersionSwitch version={version.id} />
          <a
            href={youVersionUrl(passage, version.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand-night/70 underline-offset-4 hover:underline dark:text-neutral-100/70"
          >
            {t("youVersion")}
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">{t("newTab")}</span>
          </a>
        </div>
      </header>

      <PassageText passage={passage} version={versionId} className="text-lg" />

      {reading && (
        <ReadingDone
          readingId={reading.id}
          done={reading.completedAt !== null}
          planId={reading.planId}
          planTitle={reading.planTitle}
        />
      )}

      <nav
        aria-label={t("chapters")}
        className="flex items-center justify-between gap-3 border-t border-brand-night/10 pt-4 dark:border-white/10"
      >
        {previous ? chapterLink(previous, "previous") : <span />}
        {next ? chapterLink(next, "next") : <span />}
      </nav>
    </article>
  )
}
