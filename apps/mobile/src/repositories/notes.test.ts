import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { deleteNote, listNotes, saveNote } from "./notes"
import { readOutbox } from "./write"

vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))
vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))

const now = new Date("2026-10-30T09:00:00.000Z")
const id = () => "019a3a5e-1f00-7000-8000-000000000002"

describe("meditation notes", () => {
  it("writes a note on a passage, finds it by a word, changes and deletes it", async () => {
    const db = await testDatabase()
    const saved = saveNote(
      db,
      { passage: "John.3.1-21", reflection: "Naître de nouveau" },
      null,
      { now, id }
    )
    expect(saved).toEqual({ ok: true, id: id() })
    expect(listNotes(db, { query: "nouveau" })).toMatchObject([
      { book: "John", passage: "John.3.1-21", keyVerse: null },
    ])
    expect(listNotes(db, { query: "absent" })).toEqual([])

    saveNote(db, { passage: "John.3", application: "Prier avec Paul" }, id(), {
      now,
    })
    expect(listNotes(db)).toMatchObject([
      { passage: "John.3", reflection: null, application: "Prier avec Paul" },
    ])
    deleteNote(db, id(), { now })
    expect(listNotes(db)).toEqual([])
    expect(readOutbox(db).map((change) => change.op)).toEqual([
      "upsert",
      "upsert",
      "delete",
    ])
  })

  it("refuses an empty note", async () => {
    const db = await testDatabase()
    expect(() =>
      saveNote(db, { passage: "Ps.23", reflection: " " }, null, { now, id })
    ).toThrow()
  })
})
