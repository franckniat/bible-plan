import { z } from "zod"

import { bookIds } from "@workspace/core"

/**
 * One chapter of a Bible version, as stored in data/<version>/<book>/<n>.json
 * and served as a static file. Verse numbers follow the version itself,
 * which may differ from the canon (see versification.ts).
 */
export const chapterSchema = z.object({
  version: z.string(),
  book: z.enum(bookIds),
  chapter: z.int().min(1),
  /** [verse number, text], in order. */
  verses: z.array(z.tuple([z.int().min(1), z.string().min(1)])).min(1),
})

export type BibleChapter = z.infer<typeof chapterSchema>

/** Path of a chapter file, relative to the data folder or the site root. */
export function chapterPath(version: string, book: string, chapter: number) {
  return `${version}/${book}/${chapter}.json`
}
