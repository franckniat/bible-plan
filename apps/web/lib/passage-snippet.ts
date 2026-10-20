import {
  defaultBibleVersion,
  fetchChaptersFrom,
  loadPassage,
} from "@workspace/bible-data"
import type { Locale, Passage } from "@workspace/core"

import { getSiteUrl } from "@/lib/site"

/** Collapses what the text of a verse holds into one line. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * The first words of a passage, in the translation of a language, for the
 * description and the preview image of a shared link. The text is read from
 * the site's own files (`/bible`), the way the reader does. Null when it
 * cannot be read: the caller then falls back to the reference alone.
 */
export async function getPassageSnippet(
  passage: Passage,
  locale: Locale,
  maxChars: number
): Promise<string | null> {
  try {
    const fetchChapter = fetchChaptersFrom(`${getSiteUrl().origin}/bible`)
    const text = await loadPassage(
      passage,
      defaultBibleVersion(locale),
      fetchChapter
    )
    const verses = text.chapters.flatMap((chapter) =>
      chapter.verses.map(([, verse]) => oneLine(verse))
    )
    if (verses.length === 0) return null
    let snippet = ""
    for (const verse of verses) {
      const next = snippet === "" ? verse : `${snippet} ${verse}`
      if (next.length > maxChars) {
        // The first verse alone can be longer than the room: cut it.
        // No full stop before the ellipsis: "…" ends the sentence.
        const cut = (snippet === "" ? verse.slice(0, maxChars - 1) : snippet)
          .trimEnd()
          .replace(/[.,;:!?]+$/, "")
        return `${cut}…`
      }
      snippet = next
    }
    return snippet
  } catch {
    return null
  }
}
