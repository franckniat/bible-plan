import { z } from "zod"

import { isBookId, type BookId } from "./books"
import { getChapterCount, getVerseCount } from "./verse-counts"

/** Colors a verse can be highlighted with, in the order they are offered. */
export const highlightColors = [
  "YELLOW",
  "ORANGE",
  "GREEN",
  "BLUE",
  "PURPLE",
  "PINK",
] as const
export type HighlightColor = (typeof highlightColors)[number]

export const highlightColorSchema = z.enum(highlightColors)

/** The most verses colored in one go (the longest chapter has 176). */
export const maxHighlightedVerses = 200

/**
 * A request to color verses of one chapter, numbered like the canon, or to
 * remove their color (`color: null`).
 */
export const highlightRequestSchema = z
  .object({
    book: z.string().refine(isBookId, { error: "Unknown book" }),
    chapter: z.int().min(1),
    verses: z.array(z.int().min(1)).min(1).max(maxHighlightedVerses),
    color: highlightColorSchema.nullable(),
  })
  .superRefine((request, context) => {
    // The book check above has already reported an unknown book.
    if (!isBookId(request.book)) return
    const book = request.book as BookId
    if (request.chapter > getChapterCount(book)) {
      context.addIssue({
        code: "custom",
        path: ["chapter"],
        message: "Unknown chapter",
      })
      return
    }
    const last = getVerseCount(book, request.chapter)
    if (request.verses.some((verse) => verse > last)) {
      context.addIssue({
        code: "custom",
        path: ["verses"],
        message: "Unknown verse",
      })
    }
  })
  // Each verse once, whatever the request says.
  .transform((request) => ({
    book: request.book as BookId,
    chapter: request.chapter,
    verses: [...new Set(request.verses)].sort((a, b) => a - b),
    color: request.color,
  }))

export type HighlightRequest = z.infer<typeof highlightRequestSchema>
