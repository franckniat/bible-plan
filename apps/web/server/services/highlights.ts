import "server-only"

import type { BookId, HighlightColor, HighlightRequest } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

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
 * Takes the highlights made on a device into the account of a user. A verse
 * the account has already colored keeps its color: the device never
 * overwrites. Gives the number added.
 */
export async function importHighlights(
  db: Pick<PrismaClient, "highlight">,
  userId: string,
  highlights: SavedHighlight[]
): Promise<number> {
  const { count } = await db.highlight.createMany({
    data: highlights.map((highlight) => ({ ...highlight, userId })),
    skipDuplicates: true,
  })
  return count
}
