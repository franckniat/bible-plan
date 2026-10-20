import type { MetadataRoute } from "next"

import {
  books,
  chaptersPassage,
  defaultLocale,
  getChapterCount,
  locales,
  toPassageSlug,
  type Locale,
} from "@workspace/core"

import { getSiteUrl, localizedPath } from "@/lib/site"

/** The pages of the site that do not depend on a person, with their weight. */
const pages: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/read", priority: 0.8 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
]

/** Every chapter of the Bible: what people search for ("Jean 3"). */
function chapterPaths(): string[] {
  return books.flatMap((book) =>
    Array.from({ length: getChapterCount(book.id) }, (_, index) =>
      `/read/${toPassageSlug(chaptersPassage(book.id, index + 1))}`
    )
  )
}

/**
 * The landing, the legal pages, the Bible index and its chapters, each in
 * both languages and each linked to its twin, so that a search engine shows
 * the one in the language of the reader.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl()
  const absolute = (locale: Locale, path: string) =>
    new URL(localizedPath(locale, path), site).toString()

  const entries = [
    ...pages,
    ...chapterPaths().map((path) => ({ path, priority: 0.6 })),
  ]
  return entries.flatMap(({ path, priority }) =>
    locales.map((locale) => ({
      url: absolute(locale, path),
      priority,
      alternates: {
        languages: {
          ...Object.fromEntries(
            locales.map((other) => [other, absolute(other, path)])
          ),
          "x-default": absolute(defaultLocale, path),
        },
      },
    }))
  )
}
