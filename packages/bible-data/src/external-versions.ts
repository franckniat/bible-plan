import { getVerseCount, type Locale, type Passage } from "@workspace/core"

import { usfmCode } from "./youversion"

/**
 * Translations that are still under copyright. Their text is not hosted by
 * Bible Plan (nothing in data/, no verse counts): the app lists them and sends
 * the reader to the same passage on YouVersion (bible.com). Only the versions
 * of `bibleVersions` can be read in the app, compared or highlighted.
 */
type ExternalVersionDefinition = {
  id: string
  name: string
  abbreviation: string
  language: Locale
  /** Who holds the rights. */
  publisher: string
  /** The same translation on YouVersion; abbreviation as bible.com writes it. */
  youVersion: { id: number; abbreviation: string }
}

const versions = [
  {
    id: "pdv2017",
    name: "Parole de Vie 2017",
    abbreviation: "PDV",
    language: "fr",
    publisher: "Société biblique française",
    youVersion: { id: 133, abbreviation: "PDV2017" },
  },
  {
    id: "bds",
    name: "La Bible du Semeur 2015",
    abbreviation: "BDS",
    language: "fr",
    publisher: "Biblica",
    youVersion: { id: 21, abbreviation: "BDS" },
  },
  {
    id: "s21",
    name: "La Bible Segond 21",
    abbreviation: "S21",
    language: "fr",
    publisher: "Société Biblique de Genève",
    youVersion: { id: 152, abbreviation: "S21" },
  },
  {
    id: "nfc",
    name: "Nouvelle Français courant",
    abbreviation: "NFC",
    language: "fr",
    publisher: "Société biblique française",
    youVersion: { id: 2367, abbreviation: "NFC" },
  },
  {
    id: "niv",
    name: "New International Version",
    abbreviation: "NIV",
    language: "en",
    publisher: "Biblica",
    youVersion: { id: 111, abbreviation: "NIV" },
  },
  {
    id: "nlt",
    name: "New Living Translation",
    abbreviation: "NLT",
    language: "en",
    publisher: "Tyndale House Publishers",
    youVersion: { id: 116, abbreviation: "NLT" },
  },
  {
    id: "nkjv",
    name: "New King James Version",
    abbreviation: "NKJV",
    language: "en",
    publisher: "Thomas Nelson",
    youVersion: { id: 114, abbreviation: "NKJV" },
  },
] as const satisfies readonly ExternalVersionDefinition[]

export type ExternalVersionId = (typeof versions)[number]["id"]

export type ExternalVersion = Omit<ExternalVersionDefinition, "id"> & {
  id: ExternalVersionId
}

export const externalVersions: readonly ExternalVersion[] = versions

export function isExternalVersionId(
  value: unknown
): value is ExternalVersionId {
  return externalVersions.some((version) => version.id === value)
}

export function getExternalVersion(id: ExternalVersionId): ExternalVersion {
  return externalVersions.find((version) => version.id === id)!
}

/**
 * The passage in an external translation on YouVersion. A passage over
 * several chapters opens at its first chapter. Verses are numbered like the
 * canon, which these translations do not always follow (the titles of psalms),
 * and their numbering is not known here: a psalm opens as a whole chapter
 * rather than at verses that could be the wrong ones.
 */
export function externalVersionUrl(
  passage: Passage,
  id: ExternalVersionId
): string {
  const { youVersion } = getExternalVersion(id)
  const { book, start, end } = passage
  const chapter = start.chapter
  const last = getVerseCount(book, chapter)
  const to = end.chapter === chapter ? end.verse : last
  const wholeChapter = book === "Ps" || (start.verse === 1 && to === last)
  const verses = wholeChapter
    ? ""
    : start.verse === to
      ? `.${start.verse}`
      : `.${start.verse}-${to}`
  return `https://www.bible.com/bible/${youVersion.id}/${usfmCode(book)}.${chapter}${verses}.${youVersion.abbreviation}`
}
