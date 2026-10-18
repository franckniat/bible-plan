"use client"

import { LoaderCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"

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

import { SelectionPanel } from "@/components/reader/selection-panel"
import { toggleVerse, type VerseSelection } from "@/lib/verse-selection"

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
  sharedVerses = [],
  className,
}: {
  passage: Passage
  version: BibleVersionId
  showVerseNumbers?: boolean
  /** Verses one after the other, or each on its own line. */
  verseLayout?: "flow" | "lines"
  wholeChapter?: boolean
  /** Verses a shared link points to, in the numbering of the version. */
  sharedVerses?: readonly number[]
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
  // The tapped verses, for the passage and version on screen only.
  const [selected, setSelected] = useState<
    (VerseSelection & { key: string }) | null
  >(null)
  const selection = selected?.key === key ? selected : null

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

  // The first verse a link points to is brought into view, once per page.
  const scrolledFor = useRef<string | null>(null)
  const firstShared = sharedVerses[0]
  const loaded = result?.key === key && "text" in result
  useEffect(() => {
    if (!loaded || firstShared === undefined) return
    if (scrolledFor.current === key) return
    scrolledFor.current = key
    document
      .querySelector(`[data-verse="${firstShared}"]`)
      ?.scrollIntoView({ block: "center" })
  }, [loaded, firstShared, key])

  // A stable function: the panel listens to Escape with it.
  const clearSelection = useCallback(() => setSelected(null), [])

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
      <p className="flex items-center gap-2 opacity-60">
        <LoaderCircle className="size-4 animate-spin" />
        {t("loading")}
      </p>
    )
  }

  const selectedVerses = selection
    ? text.chapters.find(({ chapter }) => chapter === selection.chapter)
    : undefined

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {selection && selectedVerses && (
        <SelectionPanel
          book={passage.book}
          version={version}
          selection={selection}
          verses={selectedVerses.verses}
          onClear={clearSelection}
        />
      )}
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
              const chosen =
                selection?.chapter === chapter &&
                selection.verses.includes(number)
              const shared = sharedVerses.includes(number)
              // From the latest selection, so taps in a row all count.
              const choose = () =>
                setSelected((current) => {
                  const next = toggleVerse(
                    current?.key === key ? current : null,
                    chapter,
                    number
                  )
                  return next && { ...next, key }
                })
              return (
                <span
                  key={number}
                  data-verse={number}
                  role="button"
                  tabIndex={0}
                  aria-pressed={chosen}
                  onClick={choose}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      choose()
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    verseLayout === "lines" && "mb-2 block",
                    around && "text-brand-night/45 dark:text-neutral-100/45",
                    shared &&
                      "underline decoration-brand-gold decoration-2 underline-offset-4",
                    (chosen || shared) && "bg-brand-gold/25"
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
