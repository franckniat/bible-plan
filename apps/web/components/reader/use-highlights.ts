"use client"

import { useCallback, useState, useSyncExternalStore } from "react"

import {
  highlightKey,
  isHighlightColor,
  type HighlightColors,
} from "@workspace/bible-data"
import type { BookId, HighlightColor } from "@workspace/core"

import { setHighlightsAction } from "@/server/actions/highlights"
import type { SavedHighlight } from "@/server/services/highlights"

// A visitor's highlights belong to the device: they live in localStorage, and
// are taken into the account when the visitor signs in.
export const deviceHighlightsKey = "bible-plan:highlights"
const changeEvent = "bible-plan:highlights-change"

function readDevice(): string {
  try {
    return localStorage.getItem(deviceHighlightsKey) ?? ""
  } catch {
    return ""
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(changeEvent, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(changeEvent, onChange)
  }
}

/** What is stored on the device, keeping only well-formed entries. */
export function parseDeviceHighlights(raw: string): HighlightColors {
  if (!raw) return {}
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== "object" || data === null) return {}
    return Object.fromEntries(
      Object.entries(data).filter(
        (entry): entry is [string, HighlightColor] =>
          /^[0-9A-Za-z]+\.\d+\.\d+$/.test(entry[0]) &&
          isHighlightColor(entry[1])
      )
    )
  } catch {
    return {}
  }
}

function writeDevice(colors: HighlightColors) {
  try {
    if (Object.keys(colors).length === 0) {
      localStorage.removeItem(deviceHighlightsKey)
    } else {
      localStorage.setItem(deviceHighlightsKey, JSON.stringify(colors))
    }
  } catch {
    // Storage blocked: the highlight lasts until the page is closed, no more.
  }
  window.dispatchEvent(new Event(changeEvent))
}

/**
 * The highlights of the reader and how to change them. Signed in, they come
 * from the account (`saved`) and changes are sent to it, shown at once; as a
 * visitor, they are read from and written to the device.
 */
export function useHighlights({
  signedIn,
  saved,
}: {
  signedIn: boolean
  saved: readonly SavedHighlight[]
}) {
  const device = parseDeviceHighlights(
    useSyncExternalStore(subscribe, readDevice, () => "")
  )
  // Changes made on this page, not yet in `saved`: a color, or null for none.
  const [changes, setChanges] = useState<Record<string, HighlightColor | null>>(
    {}
  )

  let colors: HighlightColors
  if (signedIn) {
    colors = Object.fromEntries(
      saved.map(({ book, chapter, verse, color }) => [
        highlightKey(book, chapter, verse),
        color,
      ])
    )
    for (const [key, color] of Object.entries(changes)) {
      if (color === null) delete colors[key]
      else colors[key] = color
    }
  } else {
    colors = device
  }

  /** Colors verses of the canon in one chapter, or removes their color. */
  const apply = useCallback(
    (
      book: BookId,
      chapter: number,
      verses: number[],
      color: HighlightColor | null
    ) => {
      const keys = verses.map((verse) => highlightKey(book, chapter, verse))
      if (!signedIn) {
        const next = { ...parseDeviceHighlights(readDevice()) }
        for (const key of keys) {
          if (color === null) delete next[key]
          else next[key] = color
        }
        writeDevice(next)
        return
      }

      const previous = Object.fromEntries(keys.map((key) => [key, color]))
      setChanges((current) => ({ ...current, ...previous }))
      void setHighlightsAction({ book, chapter, verses, color })
        .then(({ ok }) => ok)
        .catch(() => false)
        .then((ok) => {
          if (ok) return
          // The server refused: forget the change, back to what is saved.
          setChanges((current) => {
            const next = { ...current }
            for (const key of keys) delete next[key]
            return next
          })
        })
    },
    [signedIn]
  )

  return { colors, apply }
}
