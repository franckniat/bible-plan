import type { BibleVersionId } from "./versions"

/** A piece of verse text; italic for words added by the translators. */
export type VerseSegment = { text: string; italic: boolean }

export type VerseDisplay = {
  /** Whether the verse starts a new paragraph. */
  paragraph: boolean
  segments: VerseSegment[]
}

/**
 * How to show a verse. The King James Version marks paragraphs with "¶"
 * and the words added by the translators with brackets (printed in
 * italics); other versions are shown as they are.
 */
export function displayVerse(
  version: BibleVersionId,
  text: string
): VerseDisplay {
  if (version !== "kjv") {
    return { paragraph: false, segments: [{ text, italic: false }] }
  }
  const paragraph = text.startsWith("¶")
  const body = paragraph ? text.slice(1).trimStart() : text
  const segments: VerseSegment[] = []
  for (const part of body.split(/(\[[^\]]*\])/)) {
    if (!part) continue
    const italic = part.startsWith("[") && part.endsWith("]")
    segments.push({ text: italic ? part.slice(1, -1) : part, italic })
  }
  return { paragraph, segments }
}
