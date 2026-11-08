import type { SyncChange, SyncRecord } from "@workspace/sync"
import { describe, expect, it } from "vitest"

import { applyPush } from "./sync-push"

const me = "user-me"
const ids = {
  a: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
  b: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b22",
}

type Row = {
  id: string
  userId: string
  book: string
  chapter: number
  verse: number
  color: string
  updatedAt: Date
}

/** A database with highlights only, as the push reads and writes them. */
function fakeDb(rows: Row[] = []) {
  const writes: string[] = []
  const highlight = {
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      const verse = where.userId_book_chapter_verse as
        Pick<Row, "userId" | "book" | "chapter" | "verse"> | undefined
      return (
        rows.find((row) =>
          verse
            ? row.userId === verse.userId &&
              row.book === verse.book &&
              row.chapter === verse.chapter &&
              row.verse === verse.verse
            : row.id === where.id
        ) ?? null
      )
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { id: string }
      create: Row
      update: Partial<Row>
    }) => {
      writes.push(`upsert ${where.id}`)
      const row = rows.find((r) => r.id === where.id)
      if (row) Object.assign(row, update)
      else rows.push(create)
    },
    deleteMany: async ({ where }: { where: { id: string } }) => {
      writes.push(`delete ${where.id}`)
      rows.splice(
        rows.findIndex((row) => row.id === where.id),
        1
      )
    },
  }
  const tx = { highlight, syncTombstone: { findFirst: async () => null } }
  const db = {
    $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
  }
  return { db: db as never, rows, writes }
}

const record = (
  id: string,
  color: SyncRecord<"highlight">["color"],
  updatedAt: string
): SyncRecord<"highlight"> => ({
  id,
  book: "John",
  chapter: 3,
  verse: 16,
  color,
  updatedAt,
})

const upsert = (data: SyncRecord<"highlight">): SyncChange => ({
  table: "highlight",
  id: data.id,
  op: "upsert",
  data,
  clientUpdatedAt: data.updatedAt,
})

describe("applyPush", () => {
  it("writes a change once, however often it is sent", async () => {
    const { db, rows, writes } = fakeDb()
    const change = upsert(record(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z"))
    const first = await applyPush(db, me, [change])
    const again = await applyPush(db, me, [change])
    expect(first).toEqual({ accepted: [ids.a], rejected: [], merged: [] })
    expect(again).toEqual(first)
    expect(writes).toEqual([`upsert ${ids.a}`])
    expect(rows).toEqual([
      expect.objectContaining({ id: ids.a, userId: me, color: "YELLOW" }),
    ])
  })

  it("sends back the server's newer version", async () => {
    const { db } = fakeDb([
      {
        ...record(ids.a, "GREEN", ""),
        userId: me,
        updatedAt: new Date("2026-11-08T09:00:00.000Z"),
      },
    ])
    const response = await applyPush(db, me, [
      upsert(record(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")),
    ])
    expect(response).toEqual({
      accepted: [],
      rejected: [{ id: ids.a, reason: "stale" }],
      merged: [
        {
          table: "highlight",
          record: record(ids.a, "GREEN", "2026-11-08T09:00:00.000Z"),
        },
      ],
    })
  })

  it("replaces the same verse colored earlier under another id", async () => {
    const { db, rows } = fakeDb([
      {
        ...record(ids.b, "GREEN", ""),
        userId: me,
        updatedAt: new Date("2026-11-08T07:00:00.000Z"),
      },
    ])
    await applyPush(db, me, [
      upsert(record(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")),
    ])
    expect(rows.map((row) => [row.id, row.color])).toEqual([[ids.a, "YELLOW"]])
  })

  it("refuses to touch someone else's record", async () => {
    const { db, writes } = fakeDb([
      {
        ...record(ids.a, "GREEN", ""),
        userId: "someone-else",
        updatedAt: new Date("2026-11-08T07:00:00.000Z"),
      },
    ])
    expect(
      await applyPush(db, me, [
        upsert(record(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")),
      ])
    ).toEqual({
      accepted: [],
      rejected: [{ id: ids.a, reason: "forbidden" }],
      merged: [],
    })
    expect(writes).toEqual([])
  })
})
