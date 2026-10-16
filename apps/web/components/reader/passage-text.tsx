"use client"

import { LoaderCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import {
  displayVerse,
  fetchChaptersFrom,
  getBibleVersion,
  loadPassage,
  mapPassage,
  type BibleVersionId,
  type PassageText as Text,
} from "@workspace/bible-data"
import {
  chaptersPassage,
  getBookName,
  type Locale,
  type Passage,
} from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

const fetchChapter = fetchChaptersFrom("/bible")

/**
 * The text of a passage, loaded from the static chapter files. With
 * `wholeChapter`, the passage (part of one chapter) is shown within its whole
 * chapter, the verses around it dimmed.
 */
export function PassageText({
  passage,
  version,
  showVerseNumbers = true,
  verseLayout = "flow",
  wholeChapter = false,
  className,
}: {
  passage: Passage
  version: BibleVersionId
  showVerseNumbers?: boolean
  /** Verses one after the other, or each on its own line. */
  verseLayout?: "flow" | "lines"
  wholeChapter?: boolean
  className?: string
}) {
  const t = useTranslations("Reader")
  const locale = useLocale() as Locale
  const key = `${version}:${JSON.stringify(passage)}:${wholeChapter}`
  // The passage's verses, in the version's numbering, when shown in context.
  const range = wholeChapter
    ? mapPassage(passage, getBibleVersion(version))[0]
    : undefined
  // The last result, with the passage and version it is for: anything
  // else is still loading.
  const [result, setResult] = useState<
    { key: string; text: Text } | { key: string; failed: true } | null
  >(null)

  useEffect(() => {
    let current = true
    const shown = wholeChapter
      ? chaptersPassage(passage.book, passage.start.chapter)
      : passage
    loadPassage(shown, version, fetchChapter)
      .then((text) => {
        if (current) setResult({ key, text })
      })
      .catch(() => current && setResult({ key, failed: true }))
    return () => {
      current = false
    }
    // The key covers the passage and the version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const text = result?.key === key && "text" in result ? result.text : null
  const failed = result?.key === key && "failed" in result

  if (failed) {
    return (
      <p role="alert" className="text-destructive">
        {t("loadFailed")}
      </p>
    )
  }
  if (!text) {
    return (
      <p className="flex items-center gap-2 text-brand-night/60 dark:text-neutral-100/60">
        <LoaderCircle className="size-4 animate-spin" />
        {t("loading")}
      </p>
    )
  }

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {text.chapters.map(({ chapter, verses }) => (
        <section
          key={chapter}
          aria-label={`${getBookName(passage.book, locale)} ${chapter}`}
        >
          {text.chapters.length > 1 && (
            <h2 className="mb-3 font-heading text-xl font-semibold">
              {t("chapter", { chapter })}
            </h2>
          )}
          <p className="font-heading leading-[1.85]">
            {verses.map(([number, verse], index) => {
              const { paragraph, segments } = displayVerse(version, verse)
              const around = range && (number < range.from || number > range.to)
              return (
                <span
                  key={number}
                  className={cn(
                    verseLayout === "lines" && "mb-2 block",
                    around && "text-brand-night/45 dark:text-neutral-100/45"
                  )}
                >
                  {verseLayout === "flow" && paragraph && index > 0 && (
                    <span aria-hidden className="block h-3" />
                  )}
                  {showVerseNumbers && (
                    <sup className="mr-1 font-sans text-[0.65em] font-semibold text-brand-gold">
                      {number}
                    </sup>
                  )}
                  {segments.map((segment, part) =>
                    segment.italic ? (
                      <em key={part}>{segment.text}</em>
                    ) : (
                      <span key={part}>{segment.text}</span>
                    )
                  )}{" "}
                </span>
              )
            })}
          </p>
        </section>
      ))}
    </div>
  )
}
