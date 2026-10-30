import {
  meditationNoteInputSchema,
  parsePassageSlug,
  type MeditationNoteInput,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import { desc, eq } from "drizzle-orm"
import type { z } from "zod"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { meditationNotes } from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced } from "./write"

export type Note = typeof meditationNotes.$inferSelect

const noteTables = ["meditationNote"]

function getNote(db: Database, id: string): Note | undefined {
  return db
    .select()
    .from(meditationNotes)
    .where(eq(meditationNotes.id, id))
    .get()
}

/**
 * Writes a meditation note, or changes one (`existingId`). Throws a ZodError
 * when it is invalid (no passage, or nothing written).
 */
export function saveNote(
  db: Database,
  input: z.input<typeof meditationNoteInputSchema>,
  existingId: string | null,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): { ok: true; id: string } | { ok: false; error: "notFound" } {
  const note: MeditationNoteInput = meditationNoteInputSchema.parse(input)
  const current = existingId ? getNote(db, existingId) : undefined
  if (existingId && !current) return { ok: false, error: "notFound" }
  const record: SyncRecord<"meditationNote"> = {
    ...note,
    id: current?.id ?? id(),
    // The schema checked the slug: it is a passage of the canon.
    book: parsePassageSlug(note.passage)!.book,
    sessionId: note.sessionId ?? current?.sessionId ?? null,
    updatedAt: now.toISOString(),
  }
  writeSynced(
    db,
    { table: "meditationNote", op: "upsert", record },
    (tx) =>
      tx
        .insert(meditationNotes)
        .values(record)
        .onConflictDoUpdate({ target: meditationNotes.id, set: record })
        .run(),
    now
  )
  return { ok: true, id: record.id }
}

export function deleteNote(
  db: Database,
  noteId: string,
  { now = new Date() }: { now?: Date } = {}
): void {
  if (!getNote(db, noteId)) return
  writeSynced(
    db,
    { table: "meditationNote", op: "delete", id: noteId },
    (tx) =>
      tx.delete(meditationNotes).where(eq(meditationNotes.id, noteId)).run(),
    now
  )
}

/**
 * The notes, most recent first; `query` keeps those with the word in their
 * key verse, reflection or application, `book` those on a book.
 */
export function listNotes(
  db: Database,
  { query = "", book }: { query?: string; book?: string } = {}
): Note[] {
  const word = query.trim().toLocaleLowerCase()
  return db
    .select()
    .from(meditationNotes)
    .where(book ? eq(meditationNotes.book, book) : undefined)
    .orderBy(desc(meditationNotes.updatedAt), desc(meditationNotes.id))
    .all()
    .filter(
      (note) =>
        !word ||
        [note.reflection, note.application]
          .filter(Boolean)
          .some((text) => text!.toLocaleLowerCase().includes(word))
    )
}

export function useNotes(query: string): Note[] {
  return useLocalQuery(noteTables, () => listNotes(getDatabase(), { query }), [
    query,
  ])
}

export function useNote(id: string | undefined): Note | null {
  return useLocalQuery(
    noteTables,
    () => (id ? (getNote(getDatabase(), id) ?? null) : null),
    [id]
  )
}

/** The notes' actions, for screens. */
export const notebook = {
  save: (input: z.input<typeof meditationNoteInputSchema>, id: string | null) =>
    saveNote(getDatabase(), input, id),
  remove: (id: string) => deleteNote(getDatabase(), id),
}
