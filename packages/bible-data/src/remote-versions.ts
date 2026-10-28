import type { Locale } from "@workspace/core"

/**
 * Translations whose text is served by the YouVersion Platform API instead of
 * being stored here. The API key and the licence of each translation decide
 * which of them a given key can read, so a translation only joins the registry
 * (versions.ts) once its verse counts have been fetched into
 * data/youversion.json (see scripts/import-youversion.ts, and
 * docs/BIBLE-VERSIONS.md).
 */
export type RemoteVersionConfig = {
  /** The id used in the app (cookie, `?v=`, profile). */
  id: string
  /** The id of the translation on YouVersion. */
  youVersionId: number
  name: string
  abbreviation: string
  language: Locale
  /** How bible.com writes it in an address (".../PHP.4.19.PDV2017"). */
  youVersionAbbreviation: string
}

// Darby (YouVersion 64) and Martin 1744 (62) are left out: like the Hebrew
// Bible, they put the end of Joel in a fourth chapter and number Malachi in
// three, and the app maps chapters between versions one to one.
export const remoteVersionConfigs = [
  // Public domain or free: readable with any key. BSB and WEB are stored in
  // data/ instead (from eBible.org), so that the app can download them; the
  // Ostervald of eBible.org (1744) leaves out Psalm 66:1.
  {
    id: "ostervald",
    youVersionId: 131,
    name: "Ostervald",
    abbreviation: "OST",
    language: "fr",
    youVersionAbbreviation: "OST",
  },
  // Under copyright (Biblica): readable once the "Biblica Fast-track Bible
  // License" is accepted for the API key in the YouVersion Platform portal.
  {
    id: "niv",
    youVersionId: 111,
    name: "New International Version",
    abbreviation: "NIV",
    language: "en",
    youVersionAbbreviation: "NIV",
  },
  {
    id: "bds",
    youVersionId: 21,
    name: "La Bible du Semeur 2015",
    abbreviation: "BDS",
    language: "fr",
    youVersionAbbreviation: "BDS",
  },
] as const satisfies readonly RemoteVersionConfig[]

export type RemoteVersionId = (typeof remoteVersionConfigs)[number]["id"]

/** What is kept of a remote translation in data/youversion.json: facts only. */
export type RemoteVersionIndex = {
  /** The notice to show with the text, as YouVersion gives it; null if none. */
  copyright: string | null
  /**
   * Whether the text is free to hand out: YouVersion lists it in its "Public
   * Domain and Creative Commons" licence, or its notice says public domain.
   * Decided when the index is fetched; anything else is treated as under
   * copyright.
   */
  publicDomain: boolean
  /** Verses of each chapter in the translation's own numbering. */
  verseCounts: Record<string, number[]>
}

/** Whether a notice only says that the text is in the public domain. */
export function isPublicDomainNotice(notice: string): boolean {
  return /public domain|domaine public|libre de droits/i.test(notice)
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, code: string) => {
      if (code[0] === "#") {
        const point =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10)
        return Number.isFinite(point) ? String.fromCodePoint(point) : match
      }
      return entities[code.toLowerCase()] ?? match
    }
  )
}

/** The words of a piece of the API's HTML: no tags, no verse labels, one space. */
function plainText(html: string): string {
  return decodeEntities(
    html
      // The number printed in front of a verse is not part of its text.
      .replace(/<span class="yv-vlbl">.*?<\/span>/g, "")
      // Lines and paragraphs end with a space, not with the next word glued on.
      .replace(/<\/div>|<br\s*\/?>/g, " ")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Reads a chapter of the YouVersion API (`?format=html`) into [verse, text]
 * pairs. Verses are told by their `yv-v` markers; what comes before the first
 * one is ignored, a verse that appears twice keeps both texts, and a marker
 * for a run of verses ("1-2") counts for the first.
 */
export function parseYouVersionChapter(html: string): [number, string][] {
  const parts = html.split(/<span class="yv-v" v="([^"]*)"><\/span>/)
  const verses = new Map<number, string>()
  for (let i = 1; i < parts.length; i += 2) {
    const number = parseInt(parts[i]!, 10)
    const text = plainText(parts[i + 1] ?? "")
    if (!Number.isInteger(number) || number < 1 || text === "") continue
    verses.set(
      number,
      verses.has(number) ? `${verses.get(number)} ${text}` : text
    )
  }
  return [...verses].sort(([a], [b]) => a - b)
}
