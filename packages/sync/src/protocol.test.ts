import { describe, expect, it } from "vitest"

import {
  maxPushChanges,
  pullRequestSchema,
  pushRequestSchema,
  syncChangeSchema,
} from "./protocol"

const id = "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21"
const at = "2026-10-27T08:00:00.000Z"

const highlight = {
  id,
  book: "John",
  chapter: 3,
  verse: 16,
  color: "YELLOW",
  updatedAt: at,
}

describe("syncChangeSchema", () => {
  it("takes an upsert with its record", () => {
    const change = syncChangeSchema.parse({
      table: "highlight",
      id,
      op: "upsert",
      data: highlight,
      clientUpdatedAt: at,
    })
    expect(change.table).toBe("highlight")
  })

  it("takes a delete without a record", () => {
    expect(
      syncChangeSchema.safeParse({
        table: "prayerRequest",
        id,
        op: "delete",
        clientUpdatedAt: at,
      }).success
    ).toBe(true)
  })

  it("refuses a record of another table, id or shape", () => {
    for (const change of [
      // An upsert needs its record, a delete has none.
      { table: "highlight", id, op: "upsert", clientUpdatedAt: at },
      {
        table: "highlight",
        id,
        op: "delete",
        data: highlight,
        clientUpdatedAt: at,
      },
      // The record must be the one named.
      {
        table: "highlight",
        id: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b22",
        op: "upsert",
        data: highlight,
        clientUpdatedAt: at,
      },
      // A highlight is not a reminder.
      {
        table: "reminder",
        id,
        op: "upsert",
        data: highlight,
        clientUpdatedAt: at,
      },
      { table: "unknown", id, op: "delete", clientUpdatedAt: at },
    ]) {
      expect(syncChangeSchema.safeParse(change).success).toBe(false)
    }
  })
})

describe("pushRequestSchema", () => {
  it("bounds the size of a push", () => {
    const change = { table: "prayerLog", id, op: "delete", clientUpdatedAt: at }
    expect(
      pushRequestSchema.safeParse({
        changes: Array.from({ length: maxPushChanges + 1 }, () => change),
      }).success
    ).toBe(false)
  })
})

describe("pullRequestSchema", () => {
  it("starts from the beginning by default", () => {
    expect(pullRequestSchema.parse({})).toEqual({ cursor: "0", limit: 500 })
  })

  it("takes a 64-bit cursor and a limit from a query string", () => {
    expect(
      pullRequestSchema.parse({ cursor: "9007199254740993", limit: "50" })
    ).toEqual({ cursor: "9007199254740993", limit: 50 })
    expect(pullRequestSchema.safeParse({ cursor: "-1" }).success).toBe(false)
  })
})
