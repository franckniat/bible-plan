import type { Locale } from "../schemas/common"
import { getBookName } from "./books"
import { bookPassage, coversWholeChapters, type Passage } from "./passage"
import { isSingleChapterBook } from "./verse-counts"

export type FormatOptions = {
  /** "Genèse 1–3" (default) or "Gn 1–3". */
  style?: "long" | "short"
}

const RANGE = "–"

/** A single psalm is "Psaume 23" / "Psalm 23", several are "Psaumes 1–2". */
const singlePsalm: Record<Locale, string> = { fr: "Psaume", en: "Psalm" }

/**
 * Shortest usual form of a passage: "Genèse 1", "Genèse 1–3", "Jean 3:16",
 * "Psaumes 119:1–88", "Genèse 1:1–2:3"; for one-chapter books "Jude" (whole
 * book) or "Jude 3–5" (verses). parseReference reads every form back.
 */
export function formatPassage(
  passage: Passage,
  locale: Locale,
  { style = "long" }: FormatOptions = {}
): string {
  const { book, start, end } = passage
  const name =
    book === "Ps" && style === "long" && start.chapter === end.chapter
      ? singlePsalm[locale]
      : getBookName(book, locale, style)

  if (isSingleChapterBook(book)) {
    const whole = bookPassage(book)
    if (start.verse === whole.start.verse && end.verse === whole.end.verse) {
      return name
    }
    return start.verse === end.verse
      ? `${name} ${start.verse}`
      : `${name} ${start.verse}${RANGE}${end.verse}`
  }

  if (coversWholeChapters(passage)) {
    return start.chapter === end.chapter
      ? `${name} ${start.chapter}`
      : `${name} ${start.chapter}${RANGE}${end.chapter}`
  }

  if (start.chapter === end.chapter) {
    return start.verse === end.verse
      ? `${name} ${start.chapter}:${start.verse}`
      : `${name} ${start.chapter}:${start.verse}${RANGE}${end.verse}`
  }
  return `${name} ${start.chapter}:${start.verse}${RANGE}${end.chapter}:${end.verse}`
}

/** Several passages, separated by "; ". */
export function formatPassages(
  passages: readonly Passage[],
  locale: Locale,
  options?: FormatOptions
): string {
  return passages
    .map((passage) => formatPassage(passage, locale, options))
    .join("; ")
}
