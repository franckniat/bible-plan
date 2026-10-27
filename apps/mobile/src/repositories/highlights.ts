import { highlightKey, type HighlightColors } from "@workspace/bible-data"
import type { BookId, HighlightColor } from "@workspace/core"
import { and, eq, inArray } from "drizzle-orm"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { highlights } from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced } from "./write"

/** The colors of a chapter, keyed by canon verse ("John.3.16"), as on the web. */
export function chapterHighlights(
  db: Database,
  book: BookId,
  chapter: number
): HighlightColors {
  const rows = db
    .select()
    .from(highlights)
    .where(and(eq(highlights.book, book), eq(highlights.chapter, chapter)))
    .all()
  return Object.fromEntries(
    rows.map((row) => [
      highlightKey(row.book, row.chapter, row.verse),
      row.color,
    ])
  )
}

/**
 * Colors verses of the canon, or removes their color when `color` is null.
 * Each verse changed goes into the outbox; a verse already of that color is
 * left alone.
 */
export function setHighlights(
  db: Database,
  {
    book,
    chapter,
    verses,
    color,
  }: {
    book: BookId
    chapter: number
    verses: number[]
    color: HighlightColor | null
  },
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): void {
  const existing = new Map(
    db
      .select()
      .from(highlights)
      .where(
        and(
          eq(highlights.book, book),
          eq(highlights.chapter, chapter),
          inArray(highlights.verse, verses)
        )
      )
      .all()
      .map((row) => [row.verse, row])
  )
  const updatedAt = now.toISOString()
  for (const verse of verses) {
    const current = existing.get(verse)
    if (color === null) {
      if (!current) continue
      writeSynced(
        db,
        { table: "highlight", op: "delete", id: current.id },
        (tx) =>
          tx.delete(highlights).where(eq(highlights.id, current.id)).run(),
        now
      )
      continue
    }
    if (current?.color === color) continue
    const record = {
      id: current?.id ?? id(),
      book,
      chapter,
      verse,
      color,
      updatedAt,
    }
    writeSynced(
      db,
      { table: "highlight", op: "upsert", record },
      (tx) =>
        tx
          .insert(highlights)
          .values(record)
          .onConflictDoUpdate({
            target: highlights.id,
            set: { color, updatedAt },
          })
          .run(),
      now
    )
  }
}

/** The colors of some chapters of a book, kept up to date. */
export function useHighlights(
  book: BookId,
  chapters: readonly number[]
): HighlightColors {
  return useLocalQuery(
    ["highlight"],
    () =>
      Object.assign(
        {},
        ...chapters.map((chapter) =>
          chapterHighlights(getDatabase(), book, chapter)
        )
      ) as HighlightColors,
    [book, ...chapters]
  )
}

/** Colors verses (for screens). */
export function highlightVerses(change: Parameters<typeof setHighlights>[1]) {
  setHighlights(getDatabase(), change)
}
