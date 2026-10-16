"use client"

import { useEffect } from "react"

import {
  recordReading,
  type HistoryEntry,
} from "@/components/reader/reading-history"

/** Keeps the page being read in the device's reading history. */
export function RecordReading({ slug, reading }: Omit<HistoryEntry, "at">) {
  const readingId = reading?.id
  const planTitle = reading?.planTitle

  useEffect(() => {
    recordReading({
      slug,
      reading:
        readingId && planTitle !== undefined
          ? { id: readingId, planTitle }
          : undefined,
    })
  }, [slug, readingId, planTitle])

  return null
}
