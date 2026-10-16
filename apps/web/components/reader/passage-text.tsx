"use client"

import { LoaderCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import {
  displayVerse,
  fetchChaptersFrom,
  loadPassage,
  type BibleVersionId,
  type PassageText as Text,
} from "@workspace/bible-data"
import { getBookName, type Locale, type Passage } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

const fetchChapter = fetchChaptersFrom("/bible")

/** The text of a passage, loaded from the static chapter files. */
export function PassageText({
  passage,
  version,
  showVerseNumbers = true,
  className,
}: {
  passage: Passage
  version: BibleVersionId
  showVerseNumbers?: boolean
  className?: string
}) {
  const t = useTranslations("Reader")
  const locale = useLocale() as Locale
  const key = `${version}:${JSON.stringify(passage)}`
  // The last result, with the passage and version it is for: anything
  // else is still loading.
  const [result, setResult] = useState<
    { key: string; text: Text } | { key: string; failed: true } | null
  >(null)

  useEffect(() => {
    let current = true
    loadPassage(passage, version, fetchChapter)
      .then((text) => current && setResult({ key, text }))
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
              return (
                <span key={number}>
                  {paragraph && index > 0 && (
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
