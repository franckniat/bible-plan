import type { SyncRecord } from "@workspace/sync"
import { describe, expect, it, vi } from "vitest"

import { pullChanges } from "./sync-pull"

const ids = {
  a: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
  b: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b22",
  c: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b23",
}

const highlight = (id: string): SyncRecord<"highlight"> => ({
  id,
  book: "John",
  chapter: 3,
  verse: 16,
  color: "YELLOW",
  updatedAt: "2026-11-08T08:00:00.000Z",
})

/** The highlights written, by syncVersion; the other tables are empty. */
const written = vi.hoisted(
  () => [] as { record: unknown; syncVersion: bigint }[]
)

vi.mock("./sync-records", async () => {
  const { syncTables } = await import("@workspace/sync")
  const models: Record<string, string> = {
    highlight: "Highlight",
    prayerRequest: "PrayerRequest",
  }
  return {
    syncAccess: Object.fromEntries(
      syncTables.map((table) => [
        table,
        {
          model: models[table] ?? table,
          changedSince: async (
            _db: unknown,
            _userId: string,
            cursor: bigint,
            take: number
          ) =>
            table === "highlight"
              ? written.filter((w) => w.syncVersion > cursor).slice(0, take)
              : [],
        },
      ])
    ),
  }
})

/** A database with these tombstones and no purge yet. */
function fakeDb(
  tombstones: { table: string; recordId: string; syncVersion: bigint }[]
) {
  return {
    syncPurge: { findUnique: async () => null },
    syncTombstone: {
      findMany: async ({
        where,
        take,
      }: {
        where: { syncVersion: { gt: bigint } }
        take: number
      }) =>
        tombstones
          .filter((t) => t.syncVersion > where.syncVersion.gt)
          .slice(0, take),
    },
  } as never
}

describe("pullChanges", () => {
  it("gives what changed since the cursor in pages, in server order", async () => {
    written.splice(
      0,
      written.length,
      { record: highlight(ids.a), syncVersion: 3n },
      { record: highlight(ids.b), syncVersion: 7n }
    )
    const db = fakeDb([
      { table: "PrayerRequest", recordId: ids.c, syncVersion: 5n },
    ])
    const first = await pullChanges(db, "me", 0n, 2)
    expect(first).toEqual({
      changes: [{ table: "highlight", record: highlight(ids.a) }],
      deletions: [{ table: "prayerRequest", id: ids.c }],
      cursor: "5",
      more: true,
      reset: false,
    })
    const second = await pullChanges(db, "me", 5n, 2)
    expect(second).toEqual({
      changes: [{ table: "highlight", record: highlight(ids.b) }],
      deletions: [],
      cursor: "7",
      more: false,
      reset: false,
    })
    expect(await pullChanges(db, "me", 7n, 2)).toMatchObject({
      changes: [],
      cursor: "7",
      more: false,
    })
  })

  it("gives a record deleted and written again as written only", async () => {
    written.splice(0, written.length, {
      record: highlight(ids.a),
      syncVersion: 9n,
    })
    const db = fakeDb([
      { table: "Highlight", recordId: ids.a, syncVersion: 8n },
    ])
    expect(await pullChanges(db, "me", 0n, 10)).toMatchObject({
      changes: [{ table: "highlight", record: highlight(ids.a) }],
      deletions: [],
    })
  })

  it("starts over a phone whose cursor is older than the purge", async () => {
    const db = {
      syncPurge: { findUnique: async () => ({ id: 1, upTo: 50n }) },
    } as never
    expect(await pullChanges(db, "me", 10n, 10)).toEqual({
      changes: [],
      deletions: [],
      cursor: "0",
      more: true,
      reset: true,
    })
  })
})
