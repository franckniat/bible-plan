"use client"

import { BookOpenText } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

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
}: {
  passage: Passage
  version: BibleVersionId
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
      <PassageText
        passage={passage}
        version={version}
        showVerseNumbers={settings.verseNumbers}
        verseLayout={settings.layout}
        wholeChapter={wholeChapter}
        className={textSizes[settings.size]}
      />
    </div>
  )
}
