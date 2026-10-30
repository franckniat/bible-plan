import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"
import { uuidv7 } from "@/lib/uuid"

import {
  countPrayers,
  deletePrayer,
  listPrayers,
  markAnswered,
  markPrayed,
  savePrayerRequest,
  setPrayerStatus,
} from "./prayers"
import { readOutbox } from "./write"

vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

const now = new Date("2026-10-30T08:00:00.000Z")
const today = "2026-10-30"

function ids() {
  let next = 0
  return () => {
    const random = new Uint8Array(10)
    new DataView(random.buffer).setUint32(6, next++)
    return uuidv7(now.getTime(), random)
  }
}

describe("prayer journal", () => {
  it("adds requests and shows the least recently prayed for first", async () => {
    const db = await testDatabase()
    const id = ids()
    const first = savePrayerRequest(db, { title: "Marie" }, null, {
      now,
      id,
      today,
    })
    const second = savePrayerRequest(
      db,
      { title: "L'église", category: "CHURCH", details: " " },
      null,
      { now, id, today }
    )
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    markPrayed(db, first.id, { now, id })
    const active = listPrayers(db, "ACTIVE")
    expect(active.map((prayer) => prayer.title)).toEqual(["L'église", "Marie"])
    expect(active[0]).toMatchObject({
      category: "CHURCH",
      details: null,
      startedOn: today,
      prayerCount: 0,
    })
    expect(active[1]).toMatchObject({
      prayerCount: 1,
      lastPrayedAt: now.toISOString(),
    })
    expect(readOutbox(db).map((change) => change.table)).toEqual([
      "prayerRequest",
      "prayerRequest",
      "prayerRequest",
      "prayerLog",
    ])
  })

  it("marks a request answered, archives and restores it", async () => {
    const db = await testDatabase()
    const saved = savePrayerRequest(db, { title: "Travail" }, null, {
      now,
      id: ids(),
      today,
    })
    if (!saved.ok) throw new Error("not saved")
    markAnswered(
      db,
      saved.id,
      { answerNote: "Un poste trouvé" },
      { now, today }
    )
    expect(listPrayers(db, "ANSWERED")[0]).toMatchObject({
      answeredOn: today,
      answerNote: "Un poste trouvé",
    })
    // An answered request can no longer be prayed for.
    expect(markPrayed(db, saved.id, { now })).toEqual({
      ok: false,
      error: "notFound",
    })

    setPrayerStatus(db, saved.id, "ARCHIVED", { now })
    expect(countPrayers(db)).toEqual({ ACTIVE: 0, ANSWERED: 0, ARCHIVED: 1 })
    setPrayerStatus(db, saved.id, "ACTIVE", { now })
    expect(listPrayers(db, "ACTIVE")[0]).toMatchObject({
      answeredOn: null,
      answerNote: null,
    })
  })

  it("deletes a request with its history", async () => {
    const db = await testDatabase()
    const id = ids()
    const saved = savePrayerRequest(db, { title: "Paix" }, null, {
      now,
      id,
      today,
    })
    if (!saved.ok) throw new Error("not saved")
    markPrayed(db, saved.id, { now, id })
    deletePrayer(db, saved.id, { now })
    expect(countPrayers(db).ACTIVE).toBe(0)
    expect(
      readOutbox(db)
        .slice(-2)
        .map((change) => [change.table, change.op])
    ).toEqual([
      ["prayerLog", "delete"],
      ["prayerRequest", "delete"],
    ])
  })
})
