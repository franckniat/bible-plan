import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"
import { uuidv7 } from "@/lib/uuid"

import { backupSchema, exportBackup } from "./backup"
import { toggleBookmark } from "./bookmarks"
import { setHighlights } from "./highlights"
import { createPlan } from "./plans"
import { readOutbox } from "./write"

vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

const now = new Date("2026-11-07T08:00:00.000Z")

/** Ids that follow each other, as the phone makes them. */
function ids() {
  let next = 0
  return () => {
    const random = new Uint8Array(10)
    new DataView(random.buffer).setUint32(6, next++)
    return uuidv7(now.getTime(), random)
  }
}

describe("exportBackup", () => {
  it("keeps every record as the sync sends it, and the bookmarks", async () => {
    const db = await testDatabase()
    const id = ids()
    createPlan(
      db,
      {
        source: "template",
        templateKey: "psalms-proverbs-31-days",
        startDate: "2026-11-02",
        pace: { mode: "days", days: 31 },
      },
      "fr",
      { now, id }
    )
    setHighlights(
      db,
      { book: "John", chapter: 3, verses: [16], color: "YELLOW" },
      { now, id }
    )
    toggleBookmark(db, "Ps.23", now)

    const backup = exportBackup(db, now)
    const sent = Object.fromEntries(
      readOutbox(db).map((change) => [change.table, change.data])
    )
    expect(backup.records.readingPlan).toEqual([sent.readingPlan])
    expect(backup.records.planEnrollment).toEqual([sent.planEnrollment])
    expect(backup.records.highlight).toEqual([sent.highlight])
    expect(backup.records.prayerRequest).toEqual([])
    expect(backup.bookmarks).toEqual([
      { slug: "Ps.23", createdAt: now.toISOString() },
    ])
    expect(backup.exportedAt).toBe(now.toISOString())
    // What is written is what is read back.
    expect(backupSchema.parse(JSON.parse(JSON.stringify(backup)))).toEqual(
      backup
    )
  })
})
