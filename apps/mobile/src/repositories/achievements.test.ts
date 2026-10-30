import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"
import { bookRange } from "@/lib/book-range"
import { uuidv7 } from "@/lib/uuid"

import {
  listAchievements,
  markSeen,
  syncAchievements,
  unseenAchievements,
} from "./achievements"
import { createPlan, planDetail, setReadingRead } from "./plans"
import { markPrayed, savePrayerRequest } from "./prayers"
import { readOutbox } from "./write"

vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

let next = 0
const id = () => {
  const random = new Uint8Array(10)
  new DataView(random.buffer).setUint32(6, next++)
  return uuidv7(Date.UTC(2026, 9, 1), random)
}

describe("syncAchievements", () => {
  it("earns badges and trophies on the phone, once, and celebrates the recent ones", async () => {
    const db = await testDatabase()
    const { id: planId } = createPlan(
      db,
      {
        source: "custom",
        title: "Jude",
        passages: bookRange("Jude", "Jude"),
        startDate: "2026-10-20",
        pace: { mode: "days", days: 1 },
      },
      "fr",
      { now: new Date("2026-10-20T06:00:00.000Z"), id }
    )
    const reading = planDetail(db, planId)!.days[0]!.readings[0]!
    setReadingRead(db, reading.id, true, {
      now: new Date("2026-10-20T07:00:00.000Z"),
      id,
    })

    const now = new Date("2026-10-30T08:00:00.000Z")
    const fresh = syncAchievements(db, "Africa/Douala", { now, id })
    expect(fresh.map((a) => a.key).sort()).toEqual([
      "books",
      "first-reading",
      "plan-completed",
    ])
    // Earned ten days ago: recorded as already seen, not celebrated.
    expect(unseenAchievements(db)).toEqual([])
    expect(
      readOutbox(db).filter((c) => c.table === "achievement")
    ).toHaveLength(3)

    expect(syncAchievements(db, "Africa/Douala", { now, id })).toEqual([])
    expect(listAchievements(db)).toHaveLength(3)
  })
})

describe("celebration", () => {
  it("keeps a recent achievement to celebrate until it is seen", async () => {
    const db = await testDatabase()
    const prayer = savePrayerRequest(db, { title: "Paix" }, null, {
      now: new Date("2026-10-30T07:00:00.000Z"),
      id,
      today: "2026-10-30",
    })
    if (prayer.ok) {
      markPrayed(db, prayer.id, {
        now: new Date("2026-10-30T07:05:00.000Z"),
        id,
      })
    }
    syncAchievements(db, "Africa/Douala", {
      now: new Date("2026-10-30T07:06:00.000Z"),
      id,
    })
    const unseen = unseenAchievements(db)
    expect(unseen.map((a) => a.key)).toEqual(["first-prayer"])
    markSeen(
      db,
      unseen.map((a) => a.id),
      new Date("2026-10-30T07:07:00.000Z")
    )
    expect(unseenAchievements(db)).toEqual([])
  })
})
