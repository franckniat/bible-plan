import { describe, expect, it, vi } from "vitest"

import { onChange } from "@/db/changes"
import { testDatabase } from "@/db/test-database"

import { readOutbox, writeSynced } from "./write"

const id = "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21"
const at = new Date("2026-10-27T08:00:00.000Z")
const highlight = {
  id,
  book: "John",
  chapter: 3,
  verse: 16,
  color: "YELLOW" as const,
  updatedAt: at.toISOString(),
}

describe("writeSynced", () => {
  it("puts exactly one change in the outbox for each write", async () => {
    const db = await testDatabase()
    const apply = vi.fn()
    writeSynced(
      db,
      { table: "highlight", op: "upsert", record: highlight },
      apply,
      at
    )
    writeSynced(db, { table: "highlight", op: "delete", id }, apply, at)

    expect(apply).toHaveBeenCalledTimes(2)
    expect(readOutbox(db)).toEqual([
      {
        table: "highlight",
        id,
        op: "upsert",
        data: highlight,
        clientUpdatedAt: at.toISOString(),
      },
      {
        table: "highlight",
        id,
        op: "delete",
        clientUpdatedAt: at.toISOString(),
      },
    ])
  })

  it("keeps nothing when the write fails", async () => {
    const db = await testDatabase()
    expect(() =>
      writeSynced(
        db,
        { table: "highlight", op: "upsert", record: highlight },
        () => {
          throw new Error("disk full")
        }
      )
    ).toThrow("disk full")
    expect(readOutbox(db)).toEqual([])
  })

  it("refuses a record the sync could not send", async () => {
    const db = await testDatabase()
    const apply = vi.fn()
    expect(() =>
      writeSynced(
        db,
        {
          table: "highlight",
          op: "upsert",
          record: { ...highlight, chapter: 0 },
        },
        apply
      )
    ).toThrow()
    expect(apply).not.toHaveBeenCalled()
    expect(readOutbox(db)).toEqual([])
  })

  it("tells the screens which table changed", async () => {
    const db = await testDatabase()
    const listener = vi.fn()
    const stop = onChange(listener)
    writeSynced(db, { table: "highlight", op: "delete", id }, () => {})
    stop()
    expect(listener).toHaveBeenCalledWith(new Set(["highlight"]))
  })
})
