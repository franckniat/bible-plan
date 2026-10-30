import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"
import { bookRange } from "@/lib/book-range"
import { uuidv7 } from "@/lib/uuid"

import { activitySummary } from "./activity"
import { createPlan, planDetail, setReadingRead } from "./plans"
import { markPrayed, savePrayerRequest } from "./prayers"
import { saveSession } from "./sessions"

vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

let next = 0
const id = () => {
  const random = new Uint8Array(10)
  new DataView(random.buffer).setUint32(6, next++)
  return uuidv7(Date.UTC(2026, 9, 1), random)
}
const at = (iso: string) => ({ now: new Date(iso), id })

describe("activitySummary", () => {
  it("counts each day in the person's time zone, and the streaks", async () => {
    const db = await testDatabase()
    const { id: planId } = createPlan(
      db,
      {
        source: "custom",
        title: "Marc",
        passages: bookRange("Mark", "Mark"),
        startDate: "2026-10-26",
        pace: { mode: "chaptersPerDay", chapters: 1 },
      },
      "fr",
      at("2026-10-26T06:00:00.000Z")
    )
    const readings = planDetail(db, planId)!.days.map(
      (day) => day.readings[0]!.id
    )
    // Monday, Tuesday, and Thursday at 23:30 in Douala (Thursday 22:30 UTC).
    setReadingRead(db, readings[0]!, true, at("2026-10-26T07:00:00.000Z"))
    setReadingRead(db, readings[1]!, true, at("2026-10-27T07:00:00.000Z"))
    setReadingRead(db, readings[2]!, true, at("2026-10-29T22:30:00.000Z"))
    const prayer = savePrayerRequest(db, { title: "Paix" }, null, {
      ...at("2026-10-29T07:00:00.000Z"),
      today: "2026-10-29",
    })
    if (prayer.ok) markPrayed(db, prayer.id, at("2026-10-30T06:00:00.000Z"))
    saveSession(
      db,
      {
        kind: "MEDITATION",
        plannedSeconds: 600,
        durationSeconds: 600,
        startedAt: "2026-10-30T07:00:00.000Z",
      },
      at("2026-10-30T07:10:00.000Z")
    )

    const summary = activitySummary(db, "2026-10-30", "Africa/Douala")
    expect(summary.days.map((day) => day.day)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-29",
      "2026-10-30",
    ])
    expect(summary.days.at(-1)).toMatchObject({
      prayers: 1,
      meditationSeconds: 600,
    })
    expect(summary.streak).toEqual({
      current: 2,
      longest: 2,
      activeToday: true,
    })
    expect(summary.totals).toEqual({
      readings: 3,
      prayers: 1,
      meditationSeconds: 600,
      prayerSeconds: 0,
      activeDays: 4,
    })
  })
})
