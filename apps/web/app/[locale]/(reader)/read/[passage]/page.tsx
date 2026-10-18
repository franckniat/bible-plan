import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import {
  getBibleVersion,
  isBibleVersionId,
  mapPassage,
  youVersionUrl,
} from "@workspace/bible-data"
import {
  adjacentChapter,
  chapterSteps,
  coversWholeChapters,
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

import { ReaderArrows } from "@/components/reader/reader-arrows"
import { ParallelChapter } from "@/components/reader/parallel-chapter"
import { ParallelToggle } from "@/components/reader/parallel-toggle"
import { ReaderText } from "@/components/reader/reader-text"
import { ReadingDone } from "@/components/reader/reading-done"
import { RecordReading } from "@/components/reader/record-reading"
import { VersionSwitch } from "@/components/reader/version-switch"
import { Link, redirect } from "@/i18n/navigation"
import { bibleVersionCookie, pickBibleVersion } from "@/lib/bible-version"
import { formatCompareParam, parseCompareParam } from "@/lib/compare"
import { parseSelectionParam } from "@/lib/verse-selection"
import { listHighlights } from "@/server/services/highlights"
import { getReadingForUser } from "@/server/services/plans"
import { getSession } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/read/[passage]">): Promise<Metadata> {
  const { passage: slug } = await params
  const passage = parsePassageSlug(decodeURIComponent(slug))
  if (!passage) return {}
  const locale = (await getLocale()) as Locale
  return { title: `${formatPassage(passage, locale)} · Bible Plan` }
}

/**
 * Reads a passage, open to everyone (it is what shared verse links open).
 * The version is the one of the link (?v=), else the user's or the device's.
 */
export default async function ReadPage({
  params,
  searchParams,
}: PageProps<"/[locale]/read/[passage]">) {
  const { passage: slug } = await params
  const fromSlug = parsePassageSlug(decodeURIComponent(slug))
  if (!fromSlug) notFound()

  const user = (await getSession())?.user ?? null
  // ?reading=<id>: a reading of one of the user's plans, to mark as read.
  const {
    reading: readingId,
    v: linkVersion,
    sel,
    compare,
  } = await searchParams
  const reading =
    user && typeof readingId === "string"
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
  // A version chosen by the link stays on the pages opened from this one.
  const query = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams(
      Object.entries(params).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )
    ).toString()
    return search ? `?${search}` : ""
  }
  const linked = isBibleVersionId(linkVersion) ? linkVersion : undefined
  const stepHref = (index: number) =>
    `/read/${toPassageSlug(steps[index]!)}` +
    query({ reading: reading?.id, v: linked })
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
  const versionId = pickBibleVersion(
    [
      linkVersion,
      user?.bibleVersion,
      (await cookies()).get(bibleVersionCookie)?.value,
    ],
    locale
  )
  const version = getBibleVersion(versionId)
  // Other versions read next to this one, a whole chapter at a time.
  const others = parseCompareParam(compare, versionId)
  const parallel =
    others.length > 0 &&
    passage.start.chapter === passage.end.chapter &&
    coversWholeChapters(passage)
  const compareParam =
    others.length > 0 ? formatCompareParam(others) : undefined
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

  // The highlights of the account in the chapters on screen.
  const savedHighlights = user
    ? await listHighlights(
        prisma,
        user.id,
        passage.book,
        Array.from(
          { length: passage.end.chapter - passage.start.chapter + 1 },
          (_, index) => passage.start.chapter + index
        )
      )
    : []

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
        href={`/read/${toPassageSlug(chaptersPassage(target.book, target.chapter))}${query({ v: linked, compare: compareParam })}`}
        aria-label={t(direction, { chapter: label })}
        className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
      >
        {direction === "previous" && <ChevronLeft />}
        <span className="max-w-36 truncate">{label}</span>
        {direction === "next" && <ChevronRight />}
      </Link>
    )
  }

  // The same targets as the navigation at the end of the page.
  const chapterTarget = (
    target: { book: typeof passage.book; chapter: number } | null,
    direction: "previous" | "next"
  ) => {
    if (!target) return undefined
    const chapter = chaptersPassage(target.book, target.chapter)
    return {
      href: `/read/${toPassageSlug(chapter)}${query({ v: linked, compare: compareParam })}`,
      label: t(direction, { chapter: formatPassage(chapter, locale) }),
    }
  }
  const stepTarget = (index: number, direction: "previous" | "next") =>
    index >= 0 && index < steps.length && steps.length > 1
      ? {
          href: stepHref(index),
          label: t(`steps.${direction}`, { passage: stepLabel(index) }),
        }
      : undefined

  return (
    <article className="flex flex-col gap-6">
      <ReaderArrows
        sidebar={user !== null}
        previous={
          reading
            ? stepTarget(stepIndex - 1, "previous")
            : chapterTarget(previous, "previous")
        }
        next={
          reading
            ? stepTarget(stepIndex + 1, "next")
            : chapterTarget(next, "next")
        }
      />
      <RecordReading
        slug={toPassageSlug(passage)}
        reading={
          reading ? { id: reading.id, planTitle: reading.planTitle } : undefined
        }
      />
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
          <VersionSwitch version={version.id} signedIn={user !== null} />
          {/* Parallel reading is for whole chapters. */}
          {coversWholeChapters(passage) &&
            passage.start.chapter === passage.end.chapter && (
              <ParallelToggle main={versionId} others={others} />
            )}
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
      {parallel ? (
        <ParallelChapter
          book={passage.book}
          chapter={passage.start.chapter}
          versions={[versionId, ...others]}
        />
      ) : (
        <ReaderText
          passage={passage}
          version={versionId}
          sharedVerses={parseSelectionParam(sel)}
          highlighting={{ signedIn: user !== null, saved: savedHighlights }}
        />
      )}

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
