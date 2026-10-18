"use client"

import { BookOpenText } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, type ComponentProps } from "react"

import type { BibleVersionId } from "@workspace/bible-data"
import {
  coversWholeChapters,
  toPassageSlug,
  type Passage,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"

import { PassageText } from "@/components/reader/passage-text"
import {
  ReaderSettingsPopover,
  textSizes,
  useReaderSettings,
} from "@/components/reader/reader-settings"

/**
 * The passage with the reading settings of the device. Part of a chapter can
 * be read within the whole chapter.
 */
export function ReaderText({
  passage,
  version,
  sharedVerses,
  highlighting,
}: {
  passage: Passage
  version: BibleVersionId
  /** Verses a shared link points to (the page's `sel`). */
  sharedVerses?: readonly number[]
  /** The highlights of the account, when the page can highlight. */
  highlighting?: ComponentProps<typeof PassageText>["highlighting"]
}) {
  const t = useTranslations("Reader")
  const settings = useReaderSettings()
  const partial =
    passage.start.chapter === passage.end.chapter &&
    !coversWholeChapters(passage)
  // The passage shown in its whole chapter, until another one is opened.
  const slug = toPassageSlug(passage)
  const [wholeFor, setWholeFor] = useState<string | null>(null)
  const wholeChapter = partial && wholeFor === slug

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {partial ? (
          <Button
            variant="outline"
            onClick={() => setWholeFor(wholeChapter ? null : slug)}
          >
            <BookOpenText />
            {wholeChapter ? t("passageOnly") : t("wholeChapter")}
          </Button>
        ) : (
          <span />
        )}
        <ReaderSettingsPopover />
      </div>
      <p className="text-sm text-brand-night/60 dark:text-neutral-100/60">
        {t("selectHint")}
      </p>
      <PassageText
        passage={passage}
        version={version}
        showVerseNumbers={settings.verseNumbers}
        verseLayout={settings.layout}
        wholeChapter={wholeChapter}
        sharedVerses={sharedVerses}
        highlighting={highlighting}
        className={textSizes[settings.size]}
      />
    </div>
  )
}
