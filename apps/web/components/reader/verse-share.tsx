"use client"

import { Check, Link2, Share2, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import {
  displayVerse,
  getBibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"
import {
  formatPassage,
  type BookId,
  type Locale,
  type Passage,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"

import { shareSlug, type VerseSelection } from "@/lib/verse-selection"

/** Share bar of the selected verses: link and text, to send to someone. */
export function VerseShare({
  book,
  version,
  selection,
  verses,
  onClear,
}: {
  book: BookId
  version: BibleVersionId
  selection: VerseSelection
  /** The verses of the selection's chapter, in the version's numbering. */
  verses: [number, string][]
  onClear: () => void
}) {
  const t = useTranslations("Reader.share")
  const locale = useLocale() as Locale
  const [result, setResult] = useState<{
    key: string
    status: "copied" | "failed"
  } | null>(null)
  const canShare = typeof navigator !== "undefined" && "share" in navigator

  const { chapter, from, to } = selection
  const passage: Passage = {
    book,
    start: { chapter, verse: from },
    end: { chapter, verse: to },
  }
  const reference = `${formatPassage(passage, locale)} (${getBibleVersion(version).name})`
  const text = verses
    .filter(([number]) => number >= from && number <= to)
    .map(([, verse]) =>
      displayVerse(version, verse)
        .segments.map((segment) => segment.text)
        .join("")
        .trim()
    )
    .join(" ")
  const path = `/${locale}/read/${shareSlug(book, version, selection)}`
  const key = `${chapter}:${from}-${to}`

  // The message of a copy goes away with the selection it was for.
  const status = result?.key === key ? result.status : null
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => setResult(null), 2500)
    return () => clearTimeout(timer)
  }, [result])

  const link = () => `${window.location.origin}${path}?v=${version}`
  const copy = async (value: string) => {
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
      className="fixed inset-x-3 bottom-[calc(8rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md flex-col gap-2 rounded-2xl bg-white p-3 text-brand-night shadow-lg ring-1 ring-brand-night/15 md:bottom-24 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-white/15"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{reference}</p>
          <p
            role="status"
            className="h-5 text-brand-night/60 dark:text-neutral-100/60"
          >
            {status === "copied" && (
              <span className="flex items-center gap-1">
                <Check aria-hidden className="size-3.5" />
                {t("copied")}
              </span>
            )}
            {status === "failed" && t("copyFailed")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label={t("clear")}
        >
          <X />
        </Button>
      </div>
      <div className="flex gap-2">
        {canShare && (
          <Button
            className="flex-1"
            onClick={() =>
              navigator
                .share({
                  title: reference,
                  text: `« ${text} » — ${reference}`,
                  url: link(),
                })
                .catch(() => undefined)
            }
          >
            <Share2 />
            {t("share")}
          </Button>
        )}
        <Button
          variant={canShare ? "outline" : "default"}
          className="flex-1"
          onClick={() => copy(link())}
        >
          <Link2 />
          {t("copyLink")}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => copy(`« ${text} »\n${reference}\n${link()}`)}
        >
          {t("copyText")}
        </Button>
      </div>
    </div>
  )
}
