import { ImageResponse } from "next/og"
import { hasLocale } from "next-intl"

import {
  defaultBibleVersion,
  getBibleVersion,
} from "@workspace/bible-data"
import {
  formatPassage,
  parsePassageSlug,
  type Locale,
} from "@workspace/core"

import { routing } from "@/i18n/routing"
import { getPassageSnippet } from "@/lib/passage-snippet"
import {
  ogColors,
  ogContentType,
  ogSize,
  OgBrand,
  OgFrame,
  quote,
} from "@/lib/og"

export const alt = "Bible Plan"
export const size = ogSize
export const contentType = ogContentType

/** More than this does not fit the image at a size that can be read. */
const maxChars = 300

/**
 * The preview of a link to a passage: its reference and its first words, in
 * the default translation of the language of the link. This is what a person
 * sees when a verse is shared with them.
 */
export default async function PassageImage({
  params,
}: {
  params: Promise<{ locale: string; passage: string }>
}) {
  const { locale, passage: slug } = await params
  const language = (
    hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
  ) as Locale
  const passage = parsePassageSlug(decodeURIComponent(slug))

  const reference = passage ? formatPassage(passage, language) : "Bible Plan"
  const snippet = passage
    ? await getPassageSnippet(passage, language, maxChars)
    : null
  const version = getBibleVersion(defaultBibleVersion(language))

  // The shorter the text, the larger it can be set.
  const fontSize = !snippet
    ? 0
    : snippet.length > 220
      ? 34
      : snippet.length > 120
        ? 40
        : 48

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <OgBrand size={48} />
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            {snippet && (
              <div
                style={{
                  display: "flex",
                  fontSize,
                  lineHeight: 1.3,
                  color: ogColors.cream,
                }}
              >
                {quote(snippet, language)}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                fontSize: snippet ? 40 : 76,
                fontWeight: 700,
                color: ogColors.gold,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 56,
                  height: 5,
                  backgroundColor: ogColors.gold,
                }}
              />
              {reference}
              {snippet && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 400,
                    color: "rgba(251,246,234,0.65)",
                  }}
                >
                  {version.abbreviation}
                </div>
              )}
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    size
  )
}
