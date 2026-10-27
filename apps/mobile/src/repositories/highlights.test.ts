import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { chapterHighlights, setHighlights } from "./highlights"
import { readOutbox } from "./write"

vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

let next = 0
const id = () =>
  `0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b${(next++).toString().padStart(2, "0")}`
const now = new Date("2026-10-27T08:00:00.000Z")

describe("setHighlights", () => {
  it("colors verses and records each change in the outbox", async () => {
    const db = await testDatabase()
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16, 17], color: "YELLOW" },
      { now, id }
    )
    expect(chapterHighlights(db, "John", 3)).toEqual({
      "John.3.16": "YELLOW",
      "John.3.17": "YELLOW",
    })
    expect(readOutbox(db).map((change) => change.op)).toEqual([
      "upsert",
      "upsert",
    ])
  })

  it("changes the color of a verse under the same id", async () => {
    const db = await testDatabase()
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16], color: "YELLOW" },
      { now, id }
    )
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16], color: "GREEN" },
      { now, id }
    )
    expect(chapterHighlights(db, "John", 3)).toEqual({ "John.3.16": "GREEN" })
    const [first, second] = readOutbox(db)
    expect(second!.id).toBe(first!.id)
  })

  it("removes colors, and writes nothing for what does not change", async () => {
    const db = await testDatabase()
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16], color: "BLUE" },
      { now, id }
    )
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16], color: "BLUE" },
      { now, id }
    )
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16, 18], color: null },
      { now, id }
    )
    expect(chapterHighlights(db, "John", 3)).toEqual({})
    expect(readOutbox(db).map((change) => change.op)).toEqual([
      "upsert",
      "delete",
    ])
  })
})
