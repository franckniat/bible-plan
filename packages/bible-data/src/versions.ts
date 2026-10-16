import type { Locale } from "@workspace/core"

import kjvIndex from "../data/kjv/index.json"
import lsg1910Index from "../data/lsg1910/index.json"

export type BibleVersion = {
  id: "lsg1910" | "kjv"
  name: string
  abbreviation: string
  language: Locale
  /** Year of the text. */
  year: number
  /** Where the text comes from (public domain). */
  source: string
  /** The same translation on YouVersion (bible.com). */
  youVersion: { id: number; abbreviation: string }
  /** Verses of each chapter in this version's own numbering. */
  verseCounts: Record<string, number[]>
}

export type BibleVersionId = BibleVersion["id"]

/** Bible versions shipped with the app, all in the public domain. */
export const bibleVersions: readonly BibleVersion[] = [
  {
    id: "lsg1910",
    name: "Louis Segond 1910",
    abbreviation: "LSG",
    language: "fr",
    year: 1910,
    source: lsg1910Index.source,
    youVersion: { id: 93, abbreviation: "LSG" },
    verseCounts: lsg1910Index.verseCounts,
  },
  {
    id: "kjv",
    name: "King James Version",
    abbreviation: "KJV",
    language: "en",
    year: 1769,
    source: kjvIndex.source,
    youVersion: { id: 1, abbreviation: "KJV" },
    verseCounts: kjvIndex.verseCounts,
  },
]

export function isBibleVersionId(value: unknown): value is BibleVersionId {
  return bibleVersions.some((version) => version.id === value)
}

export function getBibleVersion(id: BibleVersionId): BibleVersion {
  return bibleVersions.find((version) => version.id === id)!
}

/** The version in the user's language, used until they choose one. */
export function defaultBibleVersion(locale: Locale): BibleVersionId {
  return (
    bibleVersions.find((version) => version.language === locale)?.id ?? "kjv"
  )
}
