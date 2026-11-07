import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"
import { uuidv7 } from "@/lib/uuid"

import { backupSchema, exportBackup, importBackup, parseBackup } from "./backup"
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

/** A phone with a plan, a highlight and a bookmark. */
async function usedPhone() {
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
  return db
}

describe("importBackup", () => {
  it("gives another phone the same data, once", async () => {
    const backup = exportBackup(await usedPhone(), now)
    const other = await testDatabase()
    const text = JSON.stringify(backup)
    expect(importBackup(other, parseBackup(text), now)).toBe(4)
    expect(exportBackup(other, now)).toEqual(backup)
    // Added as if written here: an account will push them.
    expect(readOutbox(other).map((change) => change.table)).toEqual([
      "readingPlan",
      "planEnrollment",
      "highlight",
    ])
    expect(importBackup(other, parseBackup(text), now)).toBe(0)
    expect(exportBackup(other, now)).toEqual(backup)
  })

  it("keeps what the phone has for the same verse", async () => {
    const backup = exportBackup(await usedPhone(), now)
    const other = await testDatabase()
    setHighlights(
      other,
      { book: "John", chapter: 3, verses: [16], color: "GREEN" },
      { now, id: () => "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b99" }
    )
    importBackup(other, backup, now)
    expect(exportBackup(other, now).records.highlight).toEqual([
      expect.objectContaining({ color: "GREEN" }),
    ])
  })

  it("refuses a file that is not a backup", () => {
    expect(() => parseBackup("{}")).toThrow()
    expect(() => parseBackup("not json")).toThrow()
  })
})

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
