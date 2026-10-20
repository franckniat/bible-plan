import "server-only"

import {
  parsePassageSlug,
  type MeditationNoteInput,
  type MeditationSessionInput,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type MeditationDb = Pick<
  PrismaClient,
  "meditationSession" | "meditationNote"
>

export type NoteError = "notFound"

type Outcome = Promise<{ ok: true } | { ok: false; error: NoteError }>

/** A note, as the notes page and the editor show it. */
export type NoteItem = {
  id: string
  book: string
  passage: string
  keyVerse: string | null
  reflection: string | null
  application: string | null
  sessionId: string | null
  createdAt: Date
  updatedAt: Date
}

const noteSelect = {
  id: true,
  book: true,
  passage: true,
  keyVerse: true,
  reflection: true,
  application: true,
  sessionId: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Notes a person can keep, to bound what one account stores. */
export const maxNotesPerUser = 5000

/** Saves a finished session; gives its id, for a note written right after. */
export async function saveMeditationSession(
  db: Pick<PrismaClient, "meditationSession">,
  userId: string,
  input: MeditationSessionInput
): Promise<string> {
  const { id } = await db.meditationSession.create({
    data: {
      userId,
      kind: input.kind,
      passage: input.passage,
      plannedSeconds: input.plannedSeconds,
      durationSeconds: input.durationSeconds,
      startedAt: new Date(input.startedAt),
    },
    select: { id: true },
  })
  return id
}

/** Whether a session is the user's. */
export async function ownsSession(
  db: Pick<PrismaClient, "meditationSession">,
  userId: string,
  sessionId: string
): Promise<boolean> {
  return (
    (await db.meditationSession.count({ where: { id: sessionId, userId } })) ===
    1
  )
}

/**
 * The notes of a user, latest first, narrowed by a book and by words found
 * in the text of the note or in its passage ("John.3").
 */
export async function listNotes(
  db: Pick<PrismaClient, "meditationNote">,
  userId: string,
  { book, query }: { book?: string; query?: string } = {}
): Promise<NoteItem[]> {
  const text = query?.trim()
  return db.meditationNote.findMany({
    where: {
      userId,
      ...(book ? { book } : {}),
      ...(text
        ? {
            OR: [
              { reflection: { contains: text, mode: "insensitive" } },
              { application: { contains: text, mode: "insensitive" } },
              { passage: { contains: text, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: noteSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  })
}

/** The books the user has notes on, to offer as a filter. */
export async function listNoteBooks(
  db: Pick<PrismaClient, "meditationNote">,
  userId: string
): Promise<string[]> {
  const rows = await db.meditationNote.groupBy({
    by: ["book"],
    where: { userId },
  })
  return rows.map((row) => row.book)
}

export async function getNote(
  db: Pick<PrismaClient, "meditationNote">,
  userId: string,
  id: string
): Promise<NoteItem | null> {
  return db.meditationNote.findFirst({
    where: { id, userId },
    select: noteSelect,
  })
}

/** The book of a passage slug, to file the note under it. */
function bookOf(passage: string): string {
  const parsed = parsePassageSlug(passage)
  if (!parsed) throw new Error(`Invalid passage: ${passage}`)
  return parsed.book
}

export async function createNote(
  db: Pick<PrismaClient, "meditationNote">,
  userId: string,
  input: MeditationNoteInput
): Promise<{ ok: true; id: string } | { ok: false; error: "limit" }> {
  const total = await db.meditationNote.count({ where: { userId } })
  if (total >= maxNotesPerUser) return { ok: false, error: "limit" }
  const { id } = await db.meditationNote.create({
    data: { userId, ...input, book: bookOf(input.passage) },
    select: { id: true },
  })
  return { ok: true, id }
}

/** Changes a note of the user; the session it came from stays. */
export async function updateNote(
  db: Pick<PrismaClient, "meditationNote">,
  userId: string,
  id: string,
  input: MeditationNoteInput
): Outcome {
  const { count } = await db.meditationNote.updateMany({
    where: { id, userId },
    // The session the note came from is not part of what can be changed.
    data: {
      passage: input.passage,
      book: bookOf(input.passage),
      keyVerse: input.keyVerse,
      reflection: input.reflection,
      application: input.application,
    },
  })
  return count === 1 ? { ok: true } : { ok: false, error: "notFound" }
}

export async function deleteNote(
  db: Pick<PrismaClient, "meditationNote">,
  userId: string,
  id: string
): Outcome {
  const { count } = await db.meditationNote.deleteMany({ where: { id, userId } })
  return count === 1 ? { ok: true } : { ok: false, error: "notFound" }
}
