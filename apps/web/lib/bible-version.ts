import {
  defaultBibleVersion,
  isBibleVersionId,
  type BibleVersionId,
} from "@workspace/bible-data"
import type { Locale } from "@workspace/core"

/** Cookie holding the Bible version of a visitor without an account. */
export const bibleVersionCookie = "bible-version"

/**
 * The version to read in: the first valid choice (the link, the profile, the
 * device...), else the one of the language.
 */
export function pickBibleVersion(
  choices: readonly unknown[],
  locale: Locale
): BibleVersionId {
  return choices.find(isBibleVersionId) ?? defaultBibleVersion(locale)
}
