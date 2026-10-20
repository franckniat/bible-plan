import { describe, expect, it, vi } from "vitest"

import {
  meditationNoteInputSchema,
  meditationSessionInputSchema,
  type MeditationNoteInput,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

import {
  createNote,
  deleteNote,
  listNotes,
  maxNotesPerUser,
  updateNote,
} from "./meditation"

type NoteDb = Pick<PrismaClient, "meditationNote">
const dbOf = (meditationNote: Record<string, unknown>) =>
  ({ meditationNote }) as unknown as NoteDb

const note: MeditationNoteInput = {
  passage: "John.3.1-21",
  keyVerse: "John.3.16",
  reflection: "Né de nouveau.",
  application: null,
  sessionId: null,
}

describe("notes", () => {
  it("files a note under the book of its passage", async () => {
    const meditationNote = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "n1" }),
    }
    expect(await createNote(dbOf(meditationNote), "user-1", note)).toEqual({
      ok: true,
      id: "n1",
    })
    expect(meditationNote.create.mock.calls[0]![0].data).toMatchObject({
      userId: "user-1",
      book: "John",
      passage: "John.3.1-21",
    })
  })

  it("refuses past the limit", async () => {
    const meditationNote = {
      count: vi.fn().mockResolvedValue(maxNotesPerUser),
      create: vi.fn(),
    }
    expect(await createNote(dbOf(meditationNote), "user-1", note)).toEqual({
      ok: false,
      error: "limit",
    })
    expect(meditationNote.create).not.toHaveBeenCalled()
  })

  it("changes only a note of the user, and keeps its session", async () => {
    const meditationNote = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
    await updateNote(dbOf(meditationNote), "user-1", "n1", {
      ...note,
      sessionId: "6f1d1c1e-8f6a-4a0e-9e0a-1f1c3c4d5e6f",
    })
    const args = meditationNote.updateMany.mock.calls[0]![0]
    expect(args.where).toEqual({ id: "n1", userId: "user-1" })
    expect(args.data).not.toHaveProperty("sessionId")
  })

  it("reports a note that is not the user's as missing", async () => {
    const meditationNote = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }
    expect(await deleteNote(dbOf(meditationNote), "user-1", "n1")).toEqual({
      ok: false,
      error: "notFound",
    })
  })

  it("searches the text and the passage, narrowed by book", async () => {
    const meditationNote = { findMany: vi.fn().mockResolvedValue([]) }
    await listNotes(dbOf(meditationNote), "user-1", {
      book: "John",
      query: "  amour ",
    })
    const { where } = meditationNote.findMany.mock.calls[0]![0]
    expect(where.userId).toBe("user-1")
    expect(where.book).toBe("John")
    expect(where.OR).toHaveLength(3)
    expect(where.OR[0]).toEqual({
      reflection: { contains: "amour", mode: "insensitive" },
    })
  })
})

describe("meditation inputs", () => {
  it("wants something written in a note", () => {
    expect(
      meditationNoteInputSchema.safeParse({ passage: "John.3" }).success
    ).toBe(false)
    expect(
      meditationNoteInputSchema.safeParse({
        passage: "John.3",
        reflection: "  Merci.  ",
      }).success
    ).toBe(true)
  })

  it("refuses a passage outside the canon", () => {
    expect(
      meditationNoteInputSchema.safeParse({
        passage: "John.99",
        reflection: "x",
      }).success
    ).toBe(false)
  })

  it("keeps the time really spent within reach of the plan", () => {
    const base = {
      plannedSeconds: 600,
      startedAt: "2026-10-20T08:00:00.000Z",
    }
    expect(
      meditationSessionInputSchema.safeParse({ ...base, durationSeconds: 540 })
        .success
    ).toBe(true)
    expect(
      meditationSessionInputSchema.safeParse({ ...base, durationSeconds: 5000 })
        .success
    ).toBe(false)
  })
})
