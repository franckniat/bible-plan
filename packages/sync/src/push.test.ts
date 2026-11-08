import { describe, expect, it } from "vitest"

import { deletedVersion, writtenVersion } from "./merge"
import type { SyncChange } from "./protocol"
import { decidePush } from "./push"
import type { SyncRecord } from "./records"

const ids = {
  a: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
  b: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b22",
}

const highlight = (
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

const upsert = (record: SyncRecord<"highlight">) =>
  ({
    table: "highlight",
    id: record.id,
    op: "upsert",
    data: record,
    clientUpdatedAt: record.updatedAt,
  }) as SyncChange & { table: "highlight" }

const remove = (id: string, at: string) =>
  ({
    table: "highlight",
    id,
    op: "delete",
    clientUpdatedAt: at,
  }) as SyncChange & { table: "highlight" }

describe("decidePush", () => {
  it("writes a new record", () => {
    const record = highlight(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")
    expect(decidePush(upsert(record), null, null)).toEqual({
      action: "write",
      record,
      replaces: null,
    })
  })

  it("changes nothing when the same change comes again", () => {
    const record = highlight(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")
    // The server writes dates its own way: the same time all the same.
    const stored = writtenVersion("highlight", {
      ...record,
      updatedAt: "2026-11-08T08:00:00Z",
    })
    expect(decidePush(upsert(record), stored, stored)).toEqual({
      action: "none",
    })
    const removed = deletedVersion("highlight", record, "2026-11-08T09:00:00Z")
    expect(
      decidePush(remove(ids.a, "2026-11-08T09:00:00Z"), removed, null)
    ).toEqual({ action: "none" })
  })

  it("keeps the latest write of the same record", () => {
    const newer = writtenVersion(
      "highlight",
      highlight(ids.a, "GREEN", "2026-11-08T09:00:00.000Z")
    )
    expect(
      decidePush(
        upsert(highlight(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")),
        newer,
        newer
      )
    ).toEqual({ action: "stale", current: newer.record })
    expect(
      decidePush(remove(ids.a, "2026-11-08T08:30:00.000Z"), newer, null)
    ).toEqual({ action: "stale", current: newer.record })
    expect(
      decidePush(remove(ids.a, "2026-11-08T10:00:00.000Z"), newer, null)
    ).toEqual({ action: "delete" })
  })

  it("does not bring back a record deleted later on the server", () => {
    const record = highlight(ids.a, "YELLOW", "2026-11-08T08:00:00.000Z")
    const removed = deletedVersion("highlight", record, "2026-11-08T09:00:00Z")
    expect(decidePush(upsert(record), removed, null)).toEqual({
      action: "stale",
      current: null,
    })
  })

  it("replaces the same verse colored under another id by a later write", () => {
    const other = writtenVersion(
      "highlight",
      highlight(ids.b, "GREEN", "2026-11-08T08:00:00.000Z")
    )
    const record = highlight(ids.a, "YELLOW", "2026-11-08T09:00:00.000Z")
    expect(decidePush(upsert(record), null, other)).toEqual({
      action: "write",
      record,
      replaces: ids.b,
    })
    const older = highlight(ids.a, "YELLOW", "2026-11-08T07:00:00.000Z")
    expect(decidePush(upsert(older), null, other)).toEqual({
      action: "stale",
      current: other.record,
    })
  })
})
