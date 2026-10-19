import type { Locale } from "@workspace/core"

import kjvIndex from "../data/kjv/index.json"
import lsg1910Index from "../data/lsg1910/index.json"
import youVersionIndex from "../data/youversion.json"
import {
  remoteVersionConfigs,
  type RemoteVersionId,
  type RemoteVersionIndex,
} from "./remote-versions"

/** What describes a version of the Bible whose text is stored in the app. */
type HostedDefinition = {
  id: string
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

/**
 * The versions of the Bible stored in the app, all in the public domain.
 * To add one: put its chapters in data/<id>/ (see scripts/import-ebible.ts)
 * and add an entry here; selectors, the reader, comparison and highlights
 * pick it up from this list (see docs/BIBLE-VERSIONS.md). Translations served
 * by the YouVersion Platform API are in remote-versions.ts.
 */
const hosted = [
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
] as const satisfies readonly HostedDefinition[]

/**
 * The ids of the versions: stored ones and the remote ones that are set up.
 * A remote translation is only in `bibleVersions` once its verse counts are in
 * data/youversion.json, so test with `isBibleVersionId` before trusting an id.
 */
export type BibleVersionId = (typeof hosted)[number]["id"] | RemoteVersionId

export type BibleVersion = {
  id: BibleVersionId
  name: string
  abbreviation: string
  language: Locale
  /** Year of the text, when known. */
  year?: number
  /** Where the text comes from. */
  source: string
  /** Where the text is: in the app's files, or fetched from YouVersion. */
  kind: "hosted" | "youversion"
  /** The notice to show with the text, when there is one. */
  copyright: string | null
  /** Whether the text is in the public domain (so free to hand out). */
  publicDomain: boolean
  /** The same translation on YouVersion (bible.com). */
  youVersion: { id: number; abbreviation: string }
  /** Verses of each chapter in this version's own numbering. */
  verseCounts: Record<string, number[]>
}

const remoteIndex = youVersionIndex as unknown as Partial<
  Record<string, RemoteVersionIndex>
>

const remote: BibleVersion[] = remoteVersionConfigs.flatMap((config) => {
  const index = remoteIndex[config.id]
  return index
    ? [
        {
          id: config.id,
          name: config.name,
          abbreviation: config.abbreviation,
          language: config.language,
          source: "YouVersion Platform (developers.youversion.com)",
          kind: "youversion" as const,
          copyright: index.copyright,
          publicDomain: index.publicDomain,
          youVersion: {
            id: config.youVersionId,
            abbreviation: config.youVersionAbbreviation,
          },
          verseCounts: index.verseCounts,
        },
      ]
    : []
})

/** Every version the app can read: the stored ones first, then the remote ones. */
export const bibleVersions: readonly BibleVersion[] = [
  ...hosted.map((version) => ({
    ...version,
    kind: "hosted" as const,
    copyright: null,
    publicDomain: true,
  })),
  ...remote,
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
