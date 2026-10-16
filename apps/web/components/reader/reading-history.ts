"use client"

import { useMemo, useSyncExternalStore } from "react"

import { parsePassageSlug } from "@workspace/core"

/** Where the reader stopped: a chapter read freely, or a step of a plan reading. */
export type HistoryEntry = {
  /** The chapter (or part of a chapter) on screen. */
  slug: string
  /** The plan reading it is a step of. */
  reading?: { id: string; planTitle: string }
  /** When it was opened (ms since epoch). */
  at: number
}

// The reading history belongs to the device: it lives in localStorage.
const STORAGE_KEY = "bible-plan:history"
const CHANGE_EVENT = "bible-plan:history-change"
const MAX_ENTRIES = 20

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

function parse(stored: string): HistoryEntry[] {
  try {
    const value: unknown = JSON.parse(stored)
    if (!Array.isArray(value)) return []
    return value.filter(
      (entry): entry is HistoryEntry =>
        typeof entry?.slug === "string" &&
        parsePassageSlug(entry.slug) !== null &&
        typeof entry.at === "number" &&
        (entry.reading === undefined ||
          (typeof entry.reading.id === "string" &&
            typeof entry.reading.planTitle === "string"))
    )
  } catch {
    return []
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

/**
 * One place per plan reading (its last step) and per book read freely (its
 * last chapter): reading Genesis and John side by side keeps both.
 */
const placeOf = (entry: Omit<HistoryEntry, "at">) =>
  entry.reading
    ? `reading:${entry.reading.id}`
    : `book:${parsePassageSlug(entry.slug)?.book}`

/** Notes that a chapter, or a step of a plan reading, is being read. */
export function recordReading(entry: Omit<HistoryEntry, "at">) {
  const place = placeOf(entry)
  const entries = [
    { ...entry, at: Date.now() },
    ...parse(read()).filter((other) => placeOf(other) !== place),
  ].slice(0, MAX_ENTRIES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Private browsing: nothing to resume later.
    return
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** The places read on this device, the latest first; empty on the server. */
export function useReadingHistory(): HistoryEntry[] {
  const stored = useSyncExternalStore(subscribe, read, () => "")
  return useMemo(() => parse(stored), [stored])
}

/** Where to open a place of the history. */
export function historyHref({ slug, reading }: HistoryEntry) {
  return `/read/${slug}` + (reading ? `?reading=${reading.id}` : "")
}
