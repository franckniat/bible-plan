"use client"

import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import {
  displayVerse,
  getBibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"
import type { BookId } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

import { loadChapter } from "@/components/reader/chapter-cache"
import {
  ReaderSettingsPopover,
  textSizes,
  useReaderSettings,
} from "@/components/reader/reader-settings"
import { parallelRows } from "@/lib/compare"

type Texts = Partial<Record<BibleVersionId, [number, string][] | "failed">>

/**
 * A chapter read in several versions at once, verse by verse: one column per
 * version on a large screen, the versions of each verse stacked on mobile.
 * Rows follow the verses of the canon, so the versions stay aligned even where
 * they number a chapter differently.
 */
export function ParallelChapter({
  book,
  chapter,
  versions,
}: {
  book: BookId
  chapter: number
  /** The main version first. */
  versions: BibleVersionId[]
}) {
  const t = useTranslations("Reader.parallel")
  const settings = useReaderSettings()
  const [texts, setTexts] = useState<Texts>({})
  const key = versions.join(",")

  useEffect(() => {
    let live = true
    for (const version of key.split(",") as BibleVersionId[]) {
      loadChapter(version, book, chapter)
        .then(({ verses }) => {
          if (live) setTexts((all) => ({ ...all, [version]: verses }))
        })
        .catch(() => {
          if (live) setTexts((all) => ({ ...all, [version]: "failed" }))
        })
    }
    return () => {
      live = false
    }
  }, [key, book, chapter])

  const failed = versions.some((version) => texts[version] === "failed")
  const ready = versions.every((version) => Array.isArray(texts[version]))
  const columns = versions.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ReaderSettingsPopover />
      </div>

      {failed ? (
        <p role="alert" className="text-destructive">
          {t("loadFailed")}
        </p>
      ) : !ready ? (
        <p className="flex items-center gap-2 opacity-60">
          <LoaderCircle className="size-4 animate-spin" />
          {t("loading")}
        </p>
      ) : (
        <div className={cn("flex flex-col", textSizes[settings.size])}>
          {/* Column titles, kept in view while reading (large screens). */}
          <div
            className={cn(
              "sticky top-0 z-10 hidden gap-x-8 border-b border-brand-night/10 bg-brand-cream/95 py-2 font-sans text-sm font-semibold backdrop-blur md:grid dark:border-white/10 dark:bg-neutral-950/95",
              columns
            )}
          >
            {versions.map((version) => (
              <span key={version} title={getBibleVersion(version).name}>
                {getBibleVersion(version).name}
              </span>
            ))}
          </div>

          {parallelRows(
            book,
            chapter,
            versions,
            texts as Record<string, [number, string][]>
          ).map(({ canon, cells }) => (
            <div
              key={canon}
              className={cn(
                "grid gap-x-8 gap-y-1 border-b border-brand-night/5 py-3 dark:border-white/5",
                columns
              )}
            >
              {versions.map((version, index) => (
                <p
                  key={version}
                  className="font-heading leading-[1.8]"
                  lang={getBibleVersion(version).language}
                >
                  {/* Without the column titles, say which version this is. */}
                  <span className="mb-0.5 block font-sans text-xs font-semibold tracking-wide text-brand-night/60 uppercase md:hidden dark:text-neutral-100/60">
                    {getBibleVersion(version).abbreviation}
                  </span>
                  {cells[index]!.map(([number, verse]) => (
                    <span key={number}>
                      {settings.verseNumbers && (
                        <sup className="mr-1 font-sans text-[0.65em] font-semibold text-brand-gold">
                          {number}
                        </sup>
                      )}
                      {displayVerse(version, verse)
                        .segments.map((segment) => segment.text)
                        .join("")}{" "}
                    </span>
                  ))}
                  {cells[index]!.length === 0 && (
                    <span aria-hidden className="opacity-40">
                      —
                    </span>
                  )}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
