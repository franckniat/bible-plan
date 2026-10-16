"use client"

import { Hash, Minus, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSyncExternalStore } from "react"

import type { BibleVersionId } from "@workspace/bible-data"
import type { Passage } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { PassageText } from "@/components/reader/passage-text"

const sizes = ["text-base", "text-lg", "text-xl", "text-2xl"] as const

type Display = { size: number; verseNumbers: boolean }

const defaults: Display = { size: 1, verseNumbers: true }
const STORAGE_KEY = "bible-plan:reader"
const CHANGE_EVENT = "bible-plan:reader-change"

// Display preferences belong to the device: they live in localStorage.
function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

function parse(stored: string): Display {
  try {
    const value = JSON.parse(stored) as Partial<Display>
    return {
      size:
        typeof value.size === "number"
          ? Math.min(sizes.length - 1, Math.max(0, value.size))
          : defaults.size,
      verseNumbers:
        typeof value.verseNumbers === "boolean"
          ? value.verseNumbers
          : defaults.verseNumbers,
    }
  } catch {
    return defaults
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function save(display: Display) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(display))
  } catch {
    // Private browsing: the choice lasts until the page is left.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** The passage with the reader's display settings (size, verse numbers). */
export function ReaderText({
  passage,
  version,
}: {
  passage: Passage
  version: BibleVersionId
}) {
  const t = useTranslations("Reader.display")
  const display = parse(useSyncExternalStore(subscribe, read, () => ""))

  return (
    <div className="flex flex-col gap-4">
      <div
        role="toolbar"
        aria-label={t("label")}
        className="flex flex-wrap items-center gap-1 self-end"
      >
        <Button
          variant="ghost"
          size="icon"
          disabled={display.size === 0}
          onClick={() => save({ ...display, size: display.size - 1 })}
          aria-label={t("smaller")}
          title={t("smaller")}
        >
          <Minus />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={display.size === sizes.length - 1}
          onClick={() => save({ ...display, size: display.size + 1 })}
          aria-label={t("larger")}
          title={t("larger")}
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={display.verseNumbers}
          onClick={() =>
            save({ ...display, verseNumbers: !display.verseNumbers })
          }
          aria-label={t("verseNumbers")}
          title={t("verseNumbers")}
          className={cn(display.verseNumbers && "text-brand-gold")}
        >
          <Hash />
        </Button>
      </div>
      <PassageText
        passage={passage}
        version={version}
        showVerseNumbers={display.verseNumbers}
        className={sizes[display.size]}
      />
    </div>
  )
}
