import {
  generatePlan,
  newPlanSchema,
  PlanGenerationError,
  resolveNewPlan,
  type NewPlan,
} from "@workspace/core"
import { readingPlanRecordSchema } from "@workspace/sync"
import { asc, eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"
import { planDays, planReadings } from "@/db/schema"
import type { Database } from "@/db/types"
import { bookRange } from "@/lib/book-range"
import { uuidv7 } from "@/lib/uuid"

import { createPlan, listPlans } from "./plans"
import { readOutbox } from "./write"

vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

const now = new Date("2026-10-27T08:00:00.000Z")

/** Ids that follow each other, as the phone makes them. */
function ids() {
  let next = 0
  return () => {
    const random = new Uint8Array(10)
    new DataView(random.buffer).setUint32(6, next++)
    return uuidv7(now.getTime(), random)
  }
}

/** Days and readings stored, in the shape of the generator's output. */
function storedDays(db: Database, planId: string) {
  return db
    .select()
    .from(planDays)
    .where(eq(planDays.planId, planId))
    .orderBy(asc(planDays.dayNumber))
    .all()
    .map((day) => ({
      day: day.dayNumber,
      date: day.date,
      verses: day.verses,
      readings: db
        .select()
        .from(planReadings)
        .where(eq(planReadings.dayId, day.id))
        .orderBy(asc(planReadings.position))
        .all()
        .map((reading) => ({
          track: reading.track,
          passage: {
            book: reading.book,
            start: { chapter: reading.startChapter, verse: reading.startVerse },
            end: { chapter: reading.endChapter, verse: reading.endVerse },
          },
          verses: reading.verses,
        })),
    }))
}

/** The plan the web makes for the same request. */
function webPlan(request: NewPlan) {
  return generatePlan(resolveNewPlan(newPlanSchema.parse(request), "fr").input)
}

describe("createPlan", () => {
  it("stores the same plan as the web from a template", async () => {
    const db = await testDatabase()
    const request: NewPlan = {
      source: "template",
      templateKey: "psalms-proverbs-31-days",
      startDate: "2026-11-02",
      activeWeekdays: [1, 2, 3, 4, 5],
      pace: { mode: "days", days: 31 },
    }
    const { id } = createPlan(db, request, "fr", { now, id: ids() })
    expect(storedDays(db, id)).toEqual(webPlan(request).days)
    expect(listPlans(db)).toEqual([
      {
        id,
        title: "Psaumes et Proverbes en un mois",
        templateKey: "psalms-proverbs-31-days",
        startDate: "2026-11-02",
        endDate: webPlan(request).endDate,
        totalDays: 31,
        totalReadings: 62,
        status: "ACTIVE",
      },
    ])
  })

  it("stores the same plan as the web by chapters, from a book to a book", async () => {
    const db = await testDatabase()
    const request: NewPlan = {
      source: "custom",
      title: "Genèse – Deutéronome",
      passages: bookRange("Gen", "Deut"),
      startDate: "2026-10-28",
      pace: { mode: "chaptersPerDay", chapters: 3 },
    }
    const { id } = createPlan(db, request, "fr", { now, id: ids() })
    const days = storedDays(db, id)
    expect(days).toEqual(webPlan(request).days)
    // 187 chapters, 3 a day.
    expect(days).toHaveLength(63)
  })

  it("puts the plan and its enrollment in the outbox, as the sync sends them", async () => {
    const db = await testDatabase()
    const { id } = createPlan(
      db,
      {
        source: "template",
        templateKey: "gospels-30-days",
        startDate: "2026-10-28",
        pace: { mode: "days", days: 30 },
      },
      "en",
      { now, id: ids() }
    )
    const [plan, enrollment] = readOutbox(db)
    expect(plan).toMatchObject({ table: "readingPlan", id, op: "upsert" })
    const record = readingPlanRecordSchema.parse(plan!.data)
    expect(record).toMatchObject({
      title: "The Gospels in 30 days",
      totalDays: 30,
      catchUpStrategy: "SHIFT",
    })
    expect(record.days).toHaveLength(30)
    expect(enrollment).toMatchObject({
      table: "planEnrollment",
      op: "upsert",
      data: { planId: id, status: "ACTIVE" },
    })
  })

  it("stores nothing when the plan cannot be made", async () => {
    const db = await testDatabase()
    expect(() =>
      createPlan(
        db,
        {
          source: "custom",
          title: "Jude",
          passages: bookRange("Jude", "Jude"),
          startDate: "2026-10-28",
          pace: { mode: "days", days: 100 },
        },
        "fr",
        { now, id: ids() }
      )
    ).toThrow(PlanGenerationError)
    expect(listPlans(db)).toEqual([])
    expect(readOutbox(db)).toEqual([])
  })
})
