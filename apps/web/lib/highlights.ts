import { canonVerseOf, type BibleVersion } from "@workspace/bible-data"
import type { BookId, HighlightColor } from "@workspace/core"
import { highlightColors } from "@workspace/core"

/** Highlights by verse of the canon: "John.3.16" is a color. */
export type HighlightColors = Record<string, HighlightColor>

type Versification = Pick<BibleVersion, "verseCounts">

/** The key of a verse of the canon in a HighlightColors. */
export function highlightKey(
  book: string,
  chapter: number,
  verse: number
): string {
  return `${book}.${chapter}.${verse}`
}

/**
 * The color of each verse of a chapter as it is numbered in a version, from
 * the highlights stored for the canon. A verse of a version takes the color
 * of the canon verse it belongs to.
 */
export function colorsInVersion(
  colors: HighlightColors,
  book: BookId,
  chapter: number,
  verses: readonly number[],
  version: Versification
): Record<number, HighlightColor> {
  const result: Record<number, HighlightColor> = {}
  for (const verse of verses) {
    const canon = canonVerseOf(book, chapter, verse, version)
    const color = colors[highlightKey(book, chapter, canon)]
    if (color) result[verse] = color
  }
  return result
}

/**
 * The verses of the canon to color for verses picked in a version (each once).
 */
export function canonVersesOf(
  book: BookId,
  chapter: number,
  verses: readonly number[],
  version: Versification
): number[] {
  return [
    ...new Set(verses.map((v) => canonVerseOf(book, chapter, v, version))),
  ].sort((a, b) => a - b)
}

/**
 * The color the picked verses share, or null when none is colored or they
 * differ (the panel then shows no current color).
 */
export function sharedColor(
  colors: Record<number, HighlightColor>,
  verses: readonly number[]
): HighlightColor | null {
  const first = colors[verses[0]!]
  return first && verses.every((verse) => colors[verse] === first)
    ? first
    : null
}

export function isHighlightColor(value: unknown): value is HighlightColor {
  return highlightColors.some((color) => color === value)
}

/**
 * The highlights of a device as rows to send to the account: "Rom.8.1" is
 * book Rom, chapter 8, verse 1. Keys that are not of that form are skipped.
 */
export function toSavedHighlights(colors: HighlightColors): {
  book: string
  chapter: number
  verse: number
  color: HighlightColor
}[] {
  return Object.entries(colors).flatMap(([key, color]) => {
    const match = /^([0-9A-Za-z]+)\.(\d+)\.(\d+)$/.exec(key)
    return match
      ? [
          {
            book: match[1]!,
            chapter: Number(match[2]),
            verse: Number(match[3]),
            color,
          },
        ]
      : []
  })
}
