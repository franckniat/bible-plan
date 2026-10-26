import "server-only"

import type { BookId, HighlightColor, HighlightRequest } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"
import { adoptHighlights } from "@workspace/sync"

export type HighlightsDb = Pick<PrismaClient, "highlight" | "$transaction">

/** A highlighted verse, numbered like the canon. */
export type SavedHighlight = {
  book: string
  chapter: number
  verse: number
  color: HighlightColor
}

/** The most highlights taken from a device in one go. */
export const maxImportedHighlights = 5000

/** The highlights of a user in some chapters of a book. */
export async function listHighlights(
  db: Pick<PrismaClient, "highlight">,
  userId: string,
  book: BookId,
  chapters: number[]
): Promise<SavedHighlight[]> {
  return db.highlight.findMany({
    where: { userId, book, chapter: { in: chapters } },
    select: { book: true, chapter: true, verse: true, color: true },
    orderBy: [{ chapter: "asc" }, { verse: "asc" }],
  })
}

/**
 * Colors verses of a chapter for a user, or removes their color when
 * `color` is null. A verse already colored takes the new color.
 */
export async function setHighlights(
  db: HighlightsDb,
  userId: string,
  { book, chapter, verses, color }: HighlightRequest
): Promise<void> {
  if (color === null) {
    await db.highlight.deleteMany({
      where: { userId, book, chapter, verse: { in: verses } },
    })
    return
  }
  await db.$transaction(
    verses.map((verse) =>
      db.highlight.upsert({
        where: { userId_book_chapter_verse: { userId, book, chapter, verse } },
        create: { userId, book, chapter, verse, color },
        update: { color },
      })
    )
  )
}

/**
 * Takes the highlights made on a device into the account of a user, with
 * the adoption rule shared with the mobile sync (@workspace/sync): a verse
 * the account has already colored keeps its color. Gives the number added.
 */
export async function importHighlights(
  db: Pick<PrismaClient, "highlight">,
  userId: string,
  highlights: SavedHighlight[]
): Promise<number> {
  const account = await db.highlight.findMany({
    where: {
      userId,
      book: { in: [...new Set(highlights.map((h) => h.book))] },
    },
    select: { book: true, chapter: true, verse: true },
  })
  const added = adoptHighlights(account, highlights)
  if (added.length === 0) return 0
  const { count } = await db.highlight.createMany({
    data: added.map((highlight) => ({ ...highlight, userId })),
    // A verse colored meanwhile from another tab keeps its color too.
    skipDuplicates: true,
  })
  return count
}
