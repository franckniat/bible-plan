"use client"

import { LoaderCircle, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useId, useRef, useState } from "react"

import {
  bibleVersions,
  displayVerse,
  getBibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"
import type { BookId, Locale } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { loadChapter } from "@/components/reader/chapter-cache"
import {
  defaultComparison,
  maxComparedVersions,
  toggleComparedVersion,
  versesInVersion,
} from "@/lib/compare"
import { selectionReference } from "@/lib/verse-selection"

type Column =
  | { version: BibleVersionId; verses: [number, string][] }
  | { version: BibleVersionId; failed: true }

/**
 * The selected verses in several versions, side by side (stacked on mobile).
 * The verses are chosen in the canon, so each column shows the same verses
 * in its own numbering.
 */
export function ComparePanel({
  book,
  chapter,
  canonVerses,
  current,
  remembered,
  onChange,
  onClose,
}: {
  book: BookId
  chapter: number
  /** The verses to compare, numbered like the canon. */
  canonVerses: number[]
  /** The version the reader is on. */
  current: BibleVersionId
  /** The versions compared last time. */
  remembered?: readonly unknown[]
  /** Told when the choice of versions changes, to remember it. */
  onChange?: (versions: BibleVersionId[]) => void
  onClose: () => void
}) {
  const t = useTranslations("Reader.compare")
  const locale = useLocale() as Locale
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [chosen, setChosen] = useState(() =>
    defaultComparison(current, remembered)
  )
  const [columns, setColumns] = useState<Record<string, Column>>({})

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  useEffect(() => {
    let live = true
    for (const version of chosen) {
      loadChapter(version, book, chapter)
        .then(({ verses }) => {
          const shown = new Set(
            versesInVersion(book, chapter, canonVerses, version)
          )
          const column: Column = {
            version,
            verses: verses.filter(([number]) => shown.has(number)),
          }
          if (live) setColumns((all) => ({ ...all, [version]: column }))
        })
        .catch(() => {
          if (live) {
            setColumns((all) => ({
              ...all,
              [version]: { version, failed: true },
            }))
          }
        })
    }
    return () => {
      live = false
    }
  }, [chosen, book, chapter, canonVerses])

  const reference = selectionReference(
    book,
    { chapter, verses: canonVerses },
    locale
  )

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 md:items-center md:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92svh] w-full max-w-4xl flex-col gap-4 overflow-hidden rounded-t-3xl bg-white p-5 text-brand-night shadow-2xl md:rounded-3xl dark:bg-neutral-900 dark:text-neutral-100"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-heading text-xl font-semibold">
              {t("title")}
            </h2>
            <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
              {reference}
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X />
          </Button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">
            {t("versions", { max: maxComparedVersions })}
          </legend>
          <div className="flex flex-wrap gap-2">
            {bibleVersions.map((version) => {
              const on = chosen.includes(version.id)
              return (
                <button
                  key={version.id}
                  type="button"
                  aria-pressed={on}
                  title={version.name}
                  onClick={() => {
                    const next = toggleComparedVersion(chosen, version.id)
                    setChosen(next)
                    onChange?.(next)
                  }}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on
                      ? "bg-brand-night text-brand-cream ring-brand-night dark:bg-brand-gold dark:text-neutral-950 dark:ring-brand-gold"
                      : "ring-brand-night/20 hover:bg-brand-gold/10 dark:ring-white/25"
                  )}
                >
                  {version.abbreviation}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-brand-night/60 dark:text-neutral-100/60">
            {t("limit", { max: maxComparedVersions })}
          </p>
        </fieldset>

        <div
          className={cn(
            "grid min-h-0 flex-1 gap-6 overflow-y-auto pb-2",
            chosen.length === 2 && "md:grid-cols-2",
            chosen.length >= 3 && "md:grid-cols-3"
          )}
        >
          {chosen.map((id) => {
            const version = getBibleVersion(id)
            const column = columns[id]
            return (
              <section
                key={id}
                aria-label={version.name}
                className="flex flex-col gap-2"
              >
                <h3 className="text-sm font-semibold">
                  {version.name}{" "}
                  <span className="font-normal text-brand-night/60 dark:text-neutral-100/60">
                    ({version.abbreviation})
                  </span>
                </h3>
                {!column ? (
                  <p className="flex items-center gap-2 text-sm opacity-60">
                    <LoaderCircle className="size-4 animate-spin" />
                    {t("loading")}
                  </p>
                ) : "failed" in column ? (
                  <p role="alert" className="text-sm text-destructive">
                    {t("loadFailed")}
                  </p>
                ) : (
                  <p className="font-heading leading-[1.8]">
                    {column.verses.map(([number, verse]) => (
                      <span key={number}>
                        <sup className="mr-1 font-sans text-[0.65em] font-semibold text-brand-gold">
                          {number}
                        </sup>
                        {displayVerse(id, verse)
                          .segments.map((segment) => segment.text)
                          .join("")}{" "}
                      </span>
                    ))}
                  </p>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
