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

import { ComparePanel } from "@/components/reader/compare-panel"
import {
  HighlightRow,
  highlightStyles,
} from "@/components/reader/highlight-row"
import { SelectionPanel } from "@/components/reader/selection-panel"
import { useHighlights } from "@/components/reader/use-highlights"
import { useRememberedComparison } from "@/components/reader/use-remembered-comparison"
import { canonVersesOf, colorsInVersion, sharedColor } from "@/lib/highlights"
import { toggleVerse, type VerseSelection } from "@/lib/verse-selection"
import type { SavedHighlight } from "@/server/services/highlights"

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
  highlighting,
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
  /**
   * Turns highlighting on: the highlights of the account (empty for a
   * visitor, whose are on the device) and whether someone is signed in.
   */
  highlighting?: { signedIn: boolean; saved: readonly SavedHighlight[] }
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
  // The verses being compared, numbered like the canon.
  const [comparing, setComparing] = useState<{
    chapter: number
    canonVerses: number[]
  } | null>(null)
  const closeComparison = useCallback(() => setComparing(null), [])

  const { colors, apply } = useHighlights({
    signedIn: highlighting?.signedIn ?? false,
    saved: highlighting?.saved ?? [],
  })
  const bibleVersion = getBibleVersion(version)
  const { remembered, remember } = useRememberedComparison()

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
  // The colors of the selected verses, for the highlight picker.
  const selectionColors = selection
    ? colorsInVersion(
        colors,
        passage.book,
        selection.chapter,
        selection.verses,
        bibleVersion
      )
    : {}

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {selection && selectedVerses && (
        <SelectionPanel
          book={passage.book}
          version={version}
          selection={selection}
          verses={selectedVerses.verses}
          onClear={clearSelection}
          onCompare={() => {
            setComparing({
              chapter: selection.chapter,
              canonVerses: canonVersesOf(
                passage.book,
                selection.chapter,
                selection.verses,
                bibleVersion
              ),
            })
            clearSelection()
          }}
          actions={
            highlighting && (
              <HighlightRow
                signedIn={highlighting.signedIn}
                current={sharedColor(selectionColors, selection.verses)}
                removable={Object.keys(selectionColors).length > 0}
                onPick={(color) => {
                  apply(
                    passage.book,
                    selection.chapter,
                    canonVersesOf(
                      passage.book,
                      selection.chapter,
                      selection.verses,
                      bibleVersion
                    ),
                    color
                  )
                  clearSelection()
                }}
                onRemove={() => {
                  apply(
                    passage.book,
                    selection.chapter,
                    canonVersesOf(
                      passage.book,
                      selection.chapter,
                      selection.verses,
                      bibleVersion
                    ),
                    null
                  )
                  clearSelection()
                }}
              />
            )
          }
        />
      )}
      {comparing && (
        <ComparePanel
          book={passage.book}
          chapter={comparing.chapter}
          canonVerses={comparing.canonVerses}
          current={version}
          remembered={remembered}
          onChange={remember}
          onClose={closeComparison}
        />
      )}
      {text.chapters.map(({ chapter, verses }) => {
        const chapterColors = highlighting
          ? colorsInVersion(
              colors,
              passage.book,
              chapter,
              verses.map(([number]) => number),
              bibleVersion
            )
          : {}
        return (
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
                const color = chapterColors[number]
                const { paragraph, segments } = displayVerse(version, verse)
                const around =
                  range && (number < range.from || number > range.to)
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
                      // A highlight is a color behind the text; a selection (or a
                      // verse a link points to) is a dotted line under it.
                      color &&
                        cn(highlightStyles[color], "box-decoration-clone"),
                      (chosen || shared) &&
                        "underline decoration-dotted decoration-2 underline-offset-4"
                    )}
                  >
                    {verseLayout === "flow" && paragraph && index > 0 && (
                      <span aria-hidden className="block h-3" />
                    )}
                    {showVerseNumbers && (
                      <sup
                        className={cn(
                          "mr-1 font-sans text-[0.65em] font-semibold",
                          color ? "text-neutral-950/60" : "text-brand-gold"
                        )}
                      >
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
        )
      })}
    </div>
  )
}
