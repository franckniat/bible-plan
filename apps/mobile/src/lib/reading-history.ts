import { parsePassageSlug } from "@workspace/core"

import { getPreferences, setPreferences, usePreferences } from "./preferences"

/** A passage read on this phone, and when it was opened (ms since epoch). */
export type HistoryEntry = { slug: string; at: number }

const kept = 20

/**
 * The history with a passage just opened, the latest first: one place per
 * book (its last passage), so reading Genesis and John side by side keeps
 * both, as on the web.
 */
export function withReading(
  history: readonly HistoryEntry[],
  slug: string,
  at: number
): HistoryEntry[] {
  const book = parsePassageSlug(slug)?.book
  return [
    { slug, at },
    ...history.filter((entry) => parsePassageSlug(entry.slug)?.book !== book),
  ].slice(0, kept)
}

/** Notes that a passage is being read; the Bible tab opens on it. */
export function recordReading(slug: string) {
  const { history } = getPreferences()
  if (history[0]?.slug === slug || !parsePassageSlug(slug)) return
  setPreferences({ history: withReading(history, slug, Date.now()) })
}

/** The passages read on this phone, the latest first. */
export function useReadingHistory(): readonly HistoryEntry[] {
  return usePreferences().history
}
