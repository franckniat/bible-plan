import { describe, expect, it } from "vitest"

import {
  adoptHighlights,
  deletedVersion,
  mergeAll,
  mergeVersions,
  reattachProgress,
  writtenVersion,
} from "./merge"
import type { SyncRecord } from "./records"

const ids = {
  a: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
  b: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b22",
}

const note = (
  id: string,
  reflection: string,
  updatedAt: string
): SyncRecord<"meditationNote"> => ({
  id,
  book: "John",
  passage: "John.3",
  keyVerse: null,
  reflection,
  application: null,
  sessionId: null,
  updatedAt,
})

describe("lastWriteWins", () => {
  it("keeps the latest write, whatever the order", () => {
    const old = writtenVersion(
      "meditationNote",
      note(ids.a, "old", "2026-10-27T08:00:00Z")
    )
    const fresh = writtenVersion(
      "meditationNote",
      note(ids.a, "new", "2026-10-27T09:00:00.000Z")
    )
    expect(mergeVersions(old, fresh).record?.reflection).toBe("new")
    expect(mergeVersions(fresh, old).record?.reflection).toBe("new")
  })

  it("lets a later deletion remove the record, and a later write bring it back", () => {
    const record = note(ids.a, "text", "2026-10-27T08:00:00Z")
    const write = writtenVersion("meditationNote", record)
    const removal = deletedVersion(
      "meditationNote",
      record,
      "2026-10-27T09:00:00Z"
    )
    expect(mergeVersions(write, removal).deleted).toBe(true)
    const rewrite = writtenVersion(
      "meditationNote",
      record,
      "2026-10-27T10:00:00Z"
    )
    expect(mergeVersions(removal, rewrite).deleted).toBe(false)
  })

  it("decides the same way on equal times: a deletion first", () => {
    const record = note(ids.a, "text", "2026-10-27T08:00:00Z")
    const write = writtenVersion("meditationNote", record)
    const removal = deletedVersion("meditationNote", record, record.updatedAt)
    expect(mergeVersions(write, removal)).toBe(removal)
    expect(mergeVersions(removal, write)).toBe(removal)
  })
})

describe("appendOnly", () => {
  it("keeps one progress for a reading ticked off on two phones", () => {
    const progress = (
      id: string,
      at: string
    ): SyncRecord<"readingProgress"> => ({
      id,
      enrollmentId: ids.a,
      readingId: ids.b,
      completedAt: at,
      updatedAt: at,
    })
    const merged = mergeAll([
      writtenVersion(
        "readingProgress",
        progress(ids.a, "2026-10-27T08:00:00Z")
      ),
      writtenVersion(
        "readingProgress",
        progress(ids.b, "2026-10-27T07:00:00Z")
      ),
    ])
    expect(merged.size).toBe(1)
  })
})

describe("union", () => {
  const achievement = (
    id: string,
    unlockedAt: string
  ): SyncRecord<"achievement"> => ({
    id,
    key: "faithfulness",
    level: 1,
    unlockedAt,
    updatedAt: "2026-10-27T08:00:00Z",
  })

  it("keeps the oldest unlock of a badge earned on two phones", () => {
    const merged = mergeAll([
      writtenVersion("achievement", achievement(ids.a, "2026-10-20")),
      writtenVersion("achievement", achievement(ids.b, "2026-10-12")),
    ])
    expect([...merged.values()][0]!.record).toMatchObject({
      unlockedAt: "2026-10-12",
    })
  })

  it("never loses a badge to a deletion", () => {
    const record = achievement(ids.a, "2026-10-20")
    const kept = mergeVersions(
      writtenVersion("achievement", record),
      deletedVersion("achievement", record, "2027-01-01T00:00:00Z")
    )
    expect(kept.deleted).toBe(false)
  })
})

describe("reattachProgress", () => {
  const reading = (id: string, startChapter: number) => ({
    id,
    position: 0,
    track: 0,
    book: "Gen",
    startChapter,
    startVerse: 1,
    endChapter: startChapter,
    endVerse: 31,
    verses: 31,
  })

  it("moves progress to the reading of the same passage", () => {
    const before = [reading("old-1", 1), reading("old-2", 2)]
    const after = [reading("new-1", 1), reading("old-2", 2)]
    expect(
      reattachProgress(
        [
          { id: "p1", readingId: "old-1" },
          { id: "p2", readingId: "old-2" },
        ],
        before,
        after
      )
    ).toEqual(new Map([["p1", "new-1"]]))
  })
})

describe("adoptHighlights", () => {
  it("adds the phone's verses and keeps the account's colors", () => {
    const account = [{ book: "John", chapter: 3, verse: 16, color: "GREEN" }]
    const device = [
      { book: "John", chapter: 3, verse: 16, color: "YELLOW" },
      { book: "John", chapter: 3, verse: 17, color: "YELLOW" },
    ]
    expect(adoptHighlights(account, device)).toEqual([device[1]])
  })
})
