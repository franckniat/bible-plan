"use client"

import { Check, Copy, Share2, X, type LucideIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState, type ReactNode } from "react"

import {
  displayVerse,
  getBibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"
import type { BookId, Locale } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import {
  selectionHref,
  selectionReference,
  verseRanges,
  type VerseSelection,
} from "@/lib/verse-selection"

/** The text of the selected verses; verses apart are separated by "…". */
function selectionText(
  version: BibleVersionId,
  selection: VerseSelection,
  verses: [number, string][]
): string {
  const text = new Map(
    verses.map(([number, verse]) => [
      number,
      displayVerse(version, verse)
        .segments.map((segment) => segment.text)
        .join("")
        .trim(),
    ])
  )
  return verseRanges(selection.verses)
    .map(([from, to]) =>
      Array.from({ length: to - from + 1 }, (_, i) => text.get(from + i) ?? "")
        .filter(Boolean)
        .join(" ")
    )
    .join(" … ")
}

/** One action of the panel: an icon, a label, a full-width target. */
function PanelAction({
  icon: Icon,
  onClick,
  children,
}: {
  icon: LucideIcon
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left font-medium transition-colors outline-none hover:bg-brand-night/[0.05] focus-visible:ring-3 focus-visible:ring-ring/40 dark:hover:bg-white/10"
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {children}
    </button>
  )
}

/**
 * The panel of the selected verses, as on YouVersion: what is selected, then
 * what can be done with it. A sheet at the bottom on mobile, a floating card
 * on a large screen.
 */
export function SelectionPanel({
  book,
  version,
  selection,
  verses,
  actions,
  onClear,
}: {
  book: BookId
  version: BibleVersionId
  selection: VerseSelection
  /** The verses of the selection's chapter, in the version's numbering. */
  verses: [number, string][]
  /** Other actions (highlight, compare), above copy and share. */
  actions?: ReactNode
  onClear: () => void
}) {
  const t = useTranslations("Reader.selection")
  const locale = useLocale() as Locale
  const [result, setResult] = useState<{
    key: string
    status: "copied" | "failed"
  } | null>(null)
  const canShare = typeof navigator !== "undefined" && "share" in navigator

  const reference = selectionReference(book, selection, locale)
  const abbreviation = getBibleVersion(version).youVersion.abbreviation
  const text = selectionText(version, selection, verses)
  const key = `${selection.chapter}:${selection.verses.join(",")}`
  const link = () =>
    `${window.location.origin}/${locale}${selectionHref(book, version, selection)}`

  // The message of a copy goes away with the selection it was for, and soon.
  const status = result?.key === key ? result.status : null
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => setResult(null), 2500)
    return () => clearTimeout(timer)
  }, [result])

  // Escape closes the panel and clears the selection.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClear()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClear])

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setResult({ key, status: "copied" })
    } catch {
      setResult({ key, status: "failed" })
    }
  }

  return (
    <div
      role="region"
      aria-label={t("label")}
      className={cn(
        "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex max-h-[60svh] flex-col gap-1 overflow-y-auto rounded-t-3xl bg-white p-4 text-brand-night shadow-2xl ring-1 ring-brand-night/15",
        "md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[26rem] md:-translate-x-1/2 md:rounded-3xl",
        "dark:bg-neutral-800 dark:text-neutral-100 dark:ring-white/15"
      )}
    >
      <div className="flex items-start justify-between gap-3 pb-2">
        <div className="min-w-0">
          <p className="text-xs text-brand-night/60 dark:text-neutral-100/60">
            {t("current")}
          </p>
          <p className="text-lg font-semibold">
            {reference}{" "}
            <span className="text-sm font-medium text-brand-night/70 dark:text-neutral-100/70">
              {abbreviation}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label={t("close")}
        >
          <X />
        </Button>
      </div>

      <div
        role="status"
        className="text-sm text-brand-night/70 empty:hidden dark:text-neutral-100/70"
      >
        {status === "copied" && (
          <span className="flex items-center gap-1.5">
            <Check aria-hidden className="size-4" />
            {t("copied")}
          </span>
        )}
        {status === "failed" && t("copyFailed")}
      </div>

      <div className="flex flex-col divide-y divide-brand-night/10 dark:divide-white/10">
        {actions}
        <PanelAction
          icon={Copy}
          onClick={() =>
            copy(`« ${text} »\n${reference} ${abbreviation}\n${link()}`)
          }
        >
          {t("copy")}
        </PanelAction>
        <PanelAction
          icon={Share2}
          onClick={() =>
            canShare
              ? navigator
                  .share({
                    title: `${reference} ${abbreviation}`,
                    text: `« ${text} » — ${reference} ${abbreviation}`,
                    url: link(),
                  })
                  .catch(() => undefined)
              : copy(link())
          }
        >
          {t("share")}
        </PanelAction>
      </div>
    </div>
  )
}
