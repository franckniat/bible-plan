import {
  bookIds,
  getVerseCount,
  type BookId,
  type Passage,
} from "@workspace/core"

import { mapPassage } from "./versification"
import { getBibleVersion, type BibleVersionId } from "./versions"

/** USFM book codes used by bible.com, in canonical order (as bookIds). */
const usfmCodes = [
  "GEN",
  "EXO",
  "LEV",
  "NUM",
  "DEU",
  "JOS",
  "JDG",
  "RUT",
  "1SA",
  "2SA",
  "1KI",
  "2KI",
  "1CH",
  "2CH",
  "EZR",
  "NEH",
  "EST",
  "JOB",
  "PSA",
  "PRO",
  "ECC",
  "SNG",
  "ISA",
  "JER",
  "LAM",
  "EZK",
  "DAN",
  "HOS",
  "JOL",
  "AMO",
  "OBA",
  "JON",
  "MIC",
  "NAM",
  "HAB",
  "ZEP",
  "HAG",
  "ZEC",
  "MAL",
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHP",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAS",
  "1PE",
  "2PE",
  "1JN",
  "2JN",
  "3JN",
  "JUD",
  "REV",
] as const

export function usfmCode(book: BookId): string {
  return usfmCodes[bookIds.indexOf(book)]!
}

/** The book of a USFM code ("JHN" is "John"), or undefined for an unknown code. */
export function bookOfUsfm(code: string): BookId | undefined {
  return bookIds[usfmCodes.findIndex((usfm) => usfm === code)]
}

/**
 * The same passage on YouVersion (bible.com), in the same translation; from
 * there the reader can switch to any other translation. A passage over
 * several chapters opens at its first chapter, as bible.com links hold one
 * chapter.
 */
export function youVersionUrl(
  passage: Passage,
  versionId: BibleVersionId
): string {
  const version = getBibleVersion(versionId)
  const first = mapPassage(passage, version)[0]!
  const count = version.verseCounts[passage.book]?.[first.chapter - 1]
  const wholeChapter =
    first.from === 1 &&
    first.to === (count ?? getVerseCount(passage.book, first.chapter))
  const verses = wholeChapter
    ? ""
    : first.from === first.to
      ? `.${first.from}`
      : `.${first.from}-${first.to}`
  const { id, abbreviation } = version.youVersion
  return `https://www.bible.com/bible/${id}/${usfmCode(passage.book)}.${first.chapter}${verses}.${abbreviation}`
}
