import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import {
  defaultBibleVersion,
  getBibleVersion,
  isBibleVersionId,
  mapPassage,
  youVersionUrl,
} from "@workspace/bible-data"
import {
  adjacentChapter,
  chapterSteps,
  chaptersPassage,
  formatPassage,
  getVerseCount,
  parsePassageSlug,
  toPassageSlug,
  type Locale,
} from "@workspace/core"
import { prisma } from "@workspace/db"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ReaderText } from "@/components/reader/reader-text"
import { ReadingDone } from "@/components/reader/reading-done"
import { VersionSwitch } from "@/components/reader/version-switch"
import { Link, redirect } from "@/i18n/navigation"
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
  const locale = (await getLocale()) as Locale
  // One chapter per page. A plan reading is read in steps, one per chapter:
  // the address is the step on screen.
  const steps = chapterSteps(reading?.passage ?? fromSlug)
  const found = reading
    ? steps.findIndex(
        (step) =>
          step.book === fromSlug.book &&
          toPassageSlug(step) === toPassageSlug(fromSlug)
      )
    : 0
  const stepHref = (index: number) =>
    `/read/${toPassageSlug(steps[index]!)}` +
    (reading ? `?reading=${reading.id}` : "")
  if (found === -1 || (!reading && steps.length > 1)) {
    // A chapter of the reading opens on its step, anything else on the first.
    const chapter = steps.findIndex(
      (step) =>
        step.book === fromSlug.book &&
        step.start.chapter === fromSlug.start.chapter
    )
    redirect({ href: stepHref(Math.max(0, chapter)), locale })
  }
  const stepIndex = Math.max(0, found)
  const passage = steps[stepIndex]!
  const lastStep = stepIndex === steps.length - 1
  const t = await getTranslations("Reader")
  const versionId = isBibleVersionId(user.bibleVersion)
    ? user.bibleVersion
    : defaultBibleVersion(locale)
  const version = getBibleVersion(versionId)
  // When the version numbers the verses differently (Psalm titles...).
  const ranges = mapPassage(passage, version)
  const numbering = ranges.some((range, index) => {
    const chapter = passage.start.chapter + index
    const from = chapter === passage.start.chapter ? passage.start.verse : 1
    const to =
      chapter === passage.end.chapter
        ? passage.end.verse
        : getVerseCount(passage.book, chapter)
    return range.from !== from || range.to !== to
  })
    ? ranges
        .map(({ chapter, from, to }) =>
          from === to ? `${chapter}:${from}` : `${chapter}:${from}–${to}`
        )
        .join(", ")
    : null

  const previous = adjacentChapter(passage.book, passage.start.chapter, -1)
  const next = adjacentChapter(passage.book, passage.end.chapter, 1)
  const stepLabel = (index: number) => formatPassage(steps[index]!, locale)
  const chapterLink = (
    target: NonNullable<typeof previous>,
    direction: "previous" | "next"
  ) => {
    // "Psaume 50", "Jude": the usual way to write a chapter.
    const label = formatPassage(
      chaptersPassage(target.book, target.chapter),
      locale
    )
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
        {reading && steps.length > 1 && (
          <div className="mb-3 flex flex-col gap-2">
            <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
              {t("steps.position", {
                reading: formatPassage(reading.passage, locale),
                step: stepIndex + 1,
                total: steps.length,
              })}
            </p>
            <ol aria-label={t("steps.label")} className="flex gap-1.5">
              {steps.map((_, index) => (
                <li key={index} className="flex-1">
                  <Link
                    href={stepHref(index)}
                    aria-label={t("steps.step", {
                      step: index + 1,
                      passage: stepLabel(index),
                    })}
                    aria-current={index === stepIndex ? "step" : undefined}
                    className="flex py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-full rounded-full transition-colors",
                        index <= stepIndex
                          ? "bg-brand-gold"
                          : "bg-brand-night/15 dark:bg-white/15"
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
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

      {numbering && (
        <p className="text-sm text-brand-night/60 dark:text-neutral-100/60">
          {t("numbering", { version: version.name, verses: numbering })}
        </p>
      )}
      <ReaderText passage={passage} version={versionId} />

      {reading && lastStep && (
        <ReadingDone
          readingId={reading.id}
          done={reading.completedAt !== null}
          planId={reading.planId}
          planTitle={reading.planTitle}
        />
      )}

      {!reading ? (
        <nav
          aria-label={t("chapters")}
          className="flex items-center justify-between gap-3 border-t border-brand-night/10 pt-4 dark:border-white/10"
        >
          {previous ? chapterLink(previous, "previous") : <span />}
          {next ? chapterLink(next, "next") : <span />}
        </nav>
      ) : (
        steps.length > 1 && (
          <nav
            aria-label={t("steps.label")}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-night/10 pt-4 dark:border-white/10"
          >
            {stepIndex > 0 ? (
              <Link
                href={stepHref(stepIndex - 1)}
                aria-label={t("steps.previous", {
                  passage: stepLabel(stepIndex - 1),
                })}
                className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
              >
                <ChevronLeft />
                <span className="max-w-36 truncate">
                  {stepLabel(stepIndex - 1)}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {!lastStep && (
              <Link
                href={stepHref(stepIndex + 1)}
                className={cn(buttonVariants({ size: "lg" }), "h-11 sm:px-5")}
              >
                {t("steps.next", { passage: stepLabel(stepIndex + 1) })}
                <ChevronRight />
              </Link>
            )}
          </nav>
        )
      )}
    </article>
  )
}
