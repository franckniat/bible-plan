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

import {
  catchUpPlan,
  createPlan,
  listPlans,
  planDetail,
  setReadingRead,
  todayPlans,
} from "./plans"
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
        completedReadings: 0,
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

describe("todayPlans", () => {
  const request: NewPlan = {
    source: "custom",
    title: "Matthieu",
    passages: bookRange("Matt", "Matt"),
    // Monday, Wednesday and Friday.
    activeWeekdays: [1, 3, 5],
    startDate: "2026-11-02",
    pace: { mode: "chaptersPerDay", chapters: 3 },
  }

  it("gives the readings of today", async () => {
    const db = await testDatabase()
    const { id } = createPlan(db, request, "fr", { now, id: ids() })
    const [plan] = todayPlans(db, "2026-11-04")
    expect(plan).toMatchObject({ id, title: "Matthieu", isToday: true })
    expect(plan!.day).toMatchObject({ day: 2, date: "2026-11-04" })
    // Chapters 4 to 6, read as one passage.
    expect(plan!.day!.readings).toMatchObject([
      { passage: { book: "Matt", start: { chapter: 4 }, end: { chapter: 6 } } },
    ])
  })

  it("gives the next reading day when today has none, nothing once over", async () => {
    const db = await testDatabase()
    createPlan(db, request, "fr", { now, id: ids() })
    expect(todayPlans(db, "2026-11-03")[0]).toMatchObject({
      isToday: false,
      day: { date: "2026-11-04" },
    })
    expect(todayPlans(db, "2027-01-01")[0]).toMatchObject({ day: null })
  })
})

describe("setReadingRead", () => {
  it("marks a reading as read once, offline, and unmarks it", async () => {
    const db = await testDatabase()
    const next = ids()
    createPlan(
      db,
      {
        source: "custom",
        title: "Jean",
        passages: bookRange("John", "John"),
        startDate: "2026-11-02",
        pace: { mode: "chaptersPerDay", chapters: 1 },
      },
      "fr",
      { now, id: next }
    )
    const today = () => todayPlans(db, "2026-11-04")[0]!
    const reading = today().day!.readings[0]!
    expect(reading.completedAt).toBeNull()
    expect(today().lateReadings).toBe(2)

    setReadingRead(db, reading.id, true, { now, id: next })
    setReadingRead(db, reading.id, true, { now, id: next })
    expect(today().day!.readings[0]!.completedAt).toBe(now.toISOString())
    expect(today().completedReadings).toBe(1)

    expect(planDetail(db, today().id)).toMatchObject({
      title: "Jean",
      totalReadings: 21,
      completedReadings: 1,
    })
    expect(planDetail(db, today().id)!.days).toHaveLength(21)

    setReadingRead(db, reading.id, false, { now })
    expect(today().completedReadings).toBe(0)
    expect(
      readOutbox(db)
        .slice(2)
        .map((change) => [change.table, change.op])
    ).toEqual([
      ["readingProgress", "upsert"],
      ["readingProgress", "delete"],
    ])
  })
})

describe("catchUpPlan", () => {
  /** John, a chapter a day from Monday 2 November; day 1 read. */
  async function latePlan() {
    const db = await testDatabase()
    const next = ids()
    const { id } = createPlan(
      db,
      {
        source: "custom",
        title: "Jean",
        passages: bookRange("John", "John"),
        startDate: "2026-11-02",
        pace: { mode: "chaptersPerDay", chapters: 1 },
      },
      "fr",
      { now, id: next }
    )
    const first = planDetail(db, id)!.days[0]!.readings[0]!
    setReadingRead(db, first.id, true, { now, id: next })
    return { db, id, next, first }
  }

  it("shifts a late plan: the readings left start today, the end moves", async () => {
    const { db, id, next } = await latePlan()
    // Thursday: John 2 and 3 are late.
    expect(todayPlans(db, "2026-11-05")[0]!.lateReadings).toBe(2)

    const result = catchUpPlan(db, id, "SHIFT", "2026-11-05", {
      now,
      id: next,
    })
    expect(result).toMatchObject({
      ok: true,
      changes: { endDate: "2026-11-24" },
    })
    const [plan] = todayPlans(db, "2026-11-05")
    expect(plan).toMatchObject({ lateReadings: 0, completedReadings: 1 })
    expect(plan!.day!.readings[0]!.passage.start.chapter).toBe(2)
    expect(planDetail(db, id)).toMatchObject({
      endDate: "2026-11-24",
      totalReadings: 21,
    })
    const last = readOutbox(db).at(-1)!
    expect(last).toMatchObject({ table: "readingPlan", id, op: "upsert" })
    expect(readingPlanRecordSchema.parse(last.data).days).toHaveLength(21)
  })

  it("changes nothing for a plan on time", async () => {
    const { db, id } = await latePlan()
    expect(catchUpPlan(db, id, "SHIFT", "2026-11-03", { now })).toEqual({
      ok: true,
      changes: null,
    })
  })
})

describe("catch-up and read days", () => {
  /** Read readings with their day and date, to compare. */
  function readDays(db: Database, planId: string) {
    return planDetail(db, planId)!.days.flatMap((day) =>
      day.readings
        .filter((reading) => reading.completedAt)
        .map((reading) => ({
          reading: reading.id,
          completedAt: reading.completedAt,
          day: day.id,
          date: day.date,
        }))
    )
  }

  it.each(["SHIFT", "REDISTRIBUTE"] as const)(
    "%s keeps every read reading on its day, with its progress",
    async (strategy) => {
      const db = await testDatabase()
      const next = ids()
      const { id } = createPlan(
        db,
        {
          source: "template",
          templateKey: "psalms-proverbs-31-days",
          startDate: "2026-11-02",
          pace: { mode: "days", days: 31 },
        },
        "fr",
        { now, id: next }
      )
      const days = planDetail(db, id)!.days
      // Day 1 read, day 2 half read, day 3 not read, day 6 read ahead.
      for (const reading of [
        ...days[0]!.readings,
        days[1]!.readings[0]!,
        ...days[5]!.readings,
      ]) {
        setReadingRead(db, reading.id, true, { now, id: next })
      }
      const before = readDays(db, id)
      const today = "2026-11-05"
      expect(todayPlans(db, today)[0]!.lateReadings).toBe(3)

      const result = catchUpPlan(db, id, strategy, today, { now, id: next })
      expect(result).toMatchObject({ ok: true })
      const withoutDates = (rows: ReturnType<typeof readDays>) =>
        rows.map((row) => ({ ...row, date: undefined }))
      // Read readings stay on their day, with their progress.
      expect(withoutDates(readDays(db, id))).toEqual(withoutDates(before))
      // A day read before the delay keeps its date; REDISTRIBUTE moves no
      // day, SHIFT moves the days from the first late one, read or not.
      expect(readDays(db, id)[0]).toEqual(before[0])
      if (strategy === "REDISTRIBUTE") expect(readDays(db, id)).toEqual(before)
      expect(todayPlans(db, today)[0]).toMatchObject({
        lateReadings: 0,
        completedReadings: 5,
      })
      // Every passage is still read once, days numbered in date order.
      const after = planDetail(db, id)!.days
      expect(after.map((day) => day.day)).toEqual(
        after.map((_, index) => index + 1)
      )
      expect([...after.map((day) => day.date)].sort()).toEqual(
        after.map((day) => day.date)
      )
      expect(
        after.flatMap((day) => day.readings).reduce((n, r) => n + r.verses, 0)
      ).toBe(
        days.flatMap((day) => day.readings).reduce((n, r) => n + r.verses, 0)
      )
      // Once caught up, nothing is left to change.
      expect(catchUpPlan(db, id, strategy, today, { now, id: next })).toEqual({
        ok: true,
        changes: null,
      })
    }
  )
})
