import { describe, expect, it, vi } from "vitest"

import {
  newPlanSchema,
  parseReference,
  PlanGenerationError,
} from "@workspace/core"

import {
  createPlan,
  deletePlan,
  fromDbDate,
  getPlan,
  getTodayPlans,
  listPlans,
  setPlanStatus,
  setReadingProgress,
  toDbDate,
  type PlansDb,
} from "./plans"

/** A fake client whose transaction runs the callback on the same mocks. */
function fakeDb() {
  const mocks = {
    readingPlan: { create: vi.fn(), deleteMany: vi.fn() },
    planDay: { createMany: vi.fn() },
    planReading: { createMany: vi.fn(), findUnique: vi.fn() },
    planEnrollment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    readingProgress: { createMany: vi.fn(), deleteMany: vi.fn() },
  }
  const $transaction = vi.fn(async (callback: (tx: typeof mocks) => unknown) =>
    callback(mocks)
  )
  return {
    db: { ...mocks, $transaction } as unknown as PlansDb,
    ...mocks,
    $transaction,
  }
}

const templatePlan = (templateKey: string, days: number) =>
  newPlanSchema.parse({
    source: "template",
    templateKey,
    startDate: "2027-01-01",
    pace: { mode: "days", days },
  })

describe("date columns", () => {
  it("stores calendar dates at midnight UTC", () => {
    expect(toDbDate("2027-03-28").toISOString()).toBe(
      "2027-03-28T00:00:00.000Z"
    )
    expect(fromDbDate(toDbDate("2027-12-31"))).toBe("2027-12-31")
  })
})

describe("createPlan", () => {
  it("stores a one-year plan in a single transaction", async () => {
    const fake = fakeDb()
    const { id } = await createPlan(
      fake.db,
      "user-1",
      templatePlan("mcheyne-1-year", 365),
      "fr"
    )

    expect(fake.$transaction).toHaveBeenCalledTimes(1)
    const plan = fake.readingPlan.create.mock.calls[0]![0].data
    const days = fake.planDay.createMany.mock.calls[0]![0].data
    const readings = fake.planReading.createMany.mock.calls[0]![0].data

    expect(plan).toMatchObject({
      id,
      ownerId: "user-1",
      title: "Le plan de M’Cheyne",
      templateKey: "mcheyne-1-year",
      startDate: toDbDate("2027-01-01"),
      endDate: toDbDate("2027-12-31"),
      activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
      totalDays: 365,
      totalReadings: readings.length,
    })
    expect(plan.tracks).toHaveLength(4)
    expect(days).toHaveLength(365)
    expect(days.every((day: { planId: string }) => day.planId === id)).toBe(
      true
    )
    // Every reading belongs to one of the plan's days, in day order.
    const dayIds = new Set(days.map((day: { id: string }) => day.id))
    expect(
      readings.every((reading: { dayId: string }) => dayIds.has(reading.dayId))
    ).toBe(true)
    expect(readings[0]).toMatchObject({
      position: 0,
      track: 0,
      book: "Gen",
      startChapter: 1,
      startVerse: 1,
    })
    expect(fake.planEnrollment.create).toHaveBeenCalledWith({
      data: { planId: id, userId: "user-1" },
    })
  })

  it("stores a custom plan with its title", async () => {
    const fake = fakeDb()
    await createPlan(
      fake.db,
      "user-1",
      newPlanSchema.parse({
        source: "custom",
        title: "Jean et ses lettres",
        passages: parseReference("Jn; 1 Jn; 2 Jn; 3 Jn"),
        startDate: "2027-01-04",
        activeWeekdays: [1, 3, 5],
        pace: { mode: "minutesPerDay", minutes: 10, readingWpm: 180 },
      }),
      "fr"
    )
    const plan = fake.readingPlan.create.mock.calls[0]![0].data
    expect(plan).toMatchObject({
      title: "Jean et ses lettres",
      templateKey: null,
      activeWeekdays: [1, 3, 5],
      pace: { mode: "minutesPerDay", minutes: 10, readingWpm: 180 },
    })
  })

  it("writes nothing when the plan cannot be generated", async () => {
    const fake = fakeDb()
    const request = newPlanSchema.parse({
      source: "custom",
      title: "Trop long",
      passages: parseReference("Ps 117"),
      startDate: "2027-01-01",
      pace: { mode: "days", days: 30 },
    })
    await expect(createPlan(fake.db, "user-1", request, "fr")).rejects.toThrow(
      PlanGenerationError
    )
    expect(fake.$transaction).not.toHaveBeenCalled()
  })
})

describe("listPlans", () => {
  const row = {
    status: "ACTIVE",
    _count: { progress: 12 },
    plan: {
      id: "plan-1",
      title: "La Bible en un an",
      templateKey: "bible-1-year",
      startDate: toDbDate("2027-01-01"),
      endDate: toDbDate("2027-12-31"),
      totalDays: 365,
      totalReadings: 410,
    },
  }

  it("lists the user's plans without archived ones", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findMany.mockResolvedValue([row])
    expect(await listPlans(fake.db, "user-1")).toEqual([
      {
        id: "plan-1",
        title: "La Bible en un an",
        templateKey: "bible-1-year",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        totalDays: 365,
        status: "ACTIVE",
        completedReadings: 12,
        totalReadings: 410,
      },
    ])
    expect(fake.planEnrollment.findMany.mock.calls[0]![0].where).toEqual({
      userId: "user-1",
      status: { not: "ARCHIVED" },
    })
  })

  it("can include archived plans", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findMany.mockResolvedValue([])
    await listPlans(fake.db, "user-1", { includeArchived: true })
    expect(fake.planEnrollment.findMany.mock.calls[0]![0].where).toEqual({
      userId: "user-1",
    })
  })
})

describe("getPlan", () => {
  const completedAt = new Date("2027-01-01T07:30:00Z")
  const enrollment = {
    id: "enrollment-1",
    status: "ACTIVE",
    plan: {
      id: "plan-1",
      title: "Psaumes et Proverbes",
      templateKey: "psalms-proverbs-31-days",
      startDate: toDbDate("2027-01-01"),
      endDate: toDbDate("2027-01-31"),
      activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
      tracks: [
        { name: { fr: "Psaumes", en: "Psalms" }, passages: [] },
        { name: { fr: "Proverbes", en: "Proverbs" }, passages: [] },
      ],
      totalDays: 31,
      totalVerses: 3376,
      totalReadings: 62,
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          date: toDbDate("2027-01-01"),
          verses: 109,
          readings: [
            {
              id: "reading-1",
              track: 0,
              book: "Ps",
              startChapter: 1,
              startVerse: 1,
              endChapter: 7,
              endVerse: 17,
              verses: 76,
              progress: [{ completedAt }],
            },
            {
              id: "reading-2",
              track: 1,
              book: "Prov",
              startChapter: 1,
              startVerse: 1,
              endChapter: 1,
              endVerse: 33,
              verses: 33,
              progress: [],
            },
          ],
        },
      ],
    },
  }

  it("only returns a plan the user follows", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(null)
    expect(await getPlan(fake.db, "intruder", "plan-1")).toBeNull()
    expect(fake.planEnrollment.findUnique.mock.calls[0]![0].where).toEqual({
      planId_userId: { planId: "plan-1", userId: "intruder" },
    })
  })

  it("returns the days, readings and progress of the user", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(enrollment)
    const plan = (await getPlan(fake.db, "user-1", "plan-1"))!

    expect(plan).toMatchObject({
      id: "plan-1",
      enrollmentId: "enrollment-1",
      startDate: "2027-01-01",
      endDate: "2027-01-31",
      completedReadings: 1,
      totalReadings: 62,
      trackNames: [
        { fr: "Psaumes", en: "Psalms" },
        { fr: "Proverbes", en: "Proverbs" },
      ],
    })
    expect(plan.days[0]).toEqual({
      id: "day-1",
      day: 1,
      date: "2027-01-01",
      verses: 109,
      readings: [
        {
          id: "reading-1",
          track: 0,
          passage: {
            book: "Ps",
            start: { chapter: 1, verse: 1 },
            end: { chapter: 7, verse: 17 },
          },
          verses: 76,
          completedAt,
        },
        {
          id: "reading-2",
          track: 1,
          passage: {
            book: "Prov",
            start: { chapter: 1, verse: 1 },
            end: { chapter: 1, verse: 33 },
          },
          verses: 33,
          completedAt: null,
        },
      ],
    })
    // Only the progress of this user is loaded.
    const select = fake.planEnrollment.findUnique.mock.calls[0]![0].select
    expect(
      select.plan.select.days.select.readings.select.progress.where
    ).toEqual({ enrollment: { userId: "user-1" } })
  })
})

describe("setReadingProgress", () => {
  const followed = { day: { plan: { enrollments: [{ id: "enrollment-1" }] } } }

  it("marks a reading as read without duplicates", async () => {
    const fake = fakeDb()
    fake.planReading.findUnique.mockResolvedValue(followed)
    expect(await setReadingProgress(fake.db, "user-1", "reading-1", true)).toBe(
      true
    )
    expect(fake.readingProgress.createMany).toHaveBeenCalledWith({
      data: [{ enrollmentId: "enrollment-1", readingId: "reading-1" }],
      skipDuplicates: true,
    })
  })

  it("marks a reading as not read", async () => {
    const fake = fakeDb()
    fake.planReading.findUnique.mockResolvedValue(followed)
    expect(
      await setReadingProgress(fake.db, "user-1", "reading-1", false)
    ).toBe(true)
    expect(fake.readingProgress.deleteMany).toHaveBeenCalledWith({
      where: { enrollmentId: "enrollment-1", readingId: "reading-1" },
    })
  })

  it.each([
    ["an unknown reading", null],
    ["a plan the user does not follow", { day: { plan: { enrollments: [] } } }],
  ])("refuses %s", async (_, reading) => {
    const fake = fakeDb()
    fake.planReading.findUnique.mockResolvedValue(reading)
    expect(await setReadingProgress(fake.db, "user-1", "reading-1", true)).toBe(
      false
    )
    expect(fake.readingProgress.createMany).not.toHaveBeenCalled()
  })
})

describe("getTodayPlans", () => {
  const dayRow = (date: string, completed: boolean) => ({
    id: `day-${date}`,
    dayNumber: 3,
    date: toDbDate(date),
    verses: 31,
    readings: [
      {
        id: `reading-${date}`,
        track: 0,
        book: "Gen",
        startChapter: 1,
        startVerse: 1,
        endChapter: 1,
        endVerse: 31,
        verses: 31,
        progress: completed ? [{ completedAt: new Date() }] : [],
      },
    ],
  })
  const enrollment = (title: string, days: unknown[]) => ({
    _count: { progress: 2 },
    plan: { id: title, title, tracks: [{}], totalReadings: 30, days },
  })

  it("reads the active plans from the user's today", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findMany.mockResolvedValue([])
    await getTodayPlans(fake.db, "user-1", "2027-01-03")

    const query = fake.planEnrollment.findMany.mock.calls[0]![0]
    expect(query.where).toEqual({ userId: "user-1", status: "ACTIVE" })
    expect(query.select.plan.select.days).toMatchObject({
      where: { date: { gte: toDbDate("2027-01-03") } },
      orderBy: { date: "asc" },
      take: 1,
    })
  })

  it("tells today's readings from the next ones and finished plans", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findMany.mockResolvedValue([
      enrollment("today", [dayRow("2027-01-03", true)]),
      enrollment("later", [dayRow("2027-01-05", false)]),
      enrollment("over", []),
    ])
    const plans = await getTodayPlans(fake.db, "user-1", "2027-01-03")

    expect(
      plans.map((plan) => [plan.id, plan.isToday, plan.day?.date])
    ).toEqual([
      ["today", true, "2027-01-03"],
      ["later", false, "2027-01-05"],
      ["over", false, undefined],
    ])
    expect(plans[0]).toMatchObject({
      completedReadings: 2,
      totalReadings: 30,
      trackNames: [null],
    })
    expect(plans[0]!.day!.readings[0]!.completedAt).toBeInstanceOf(Date)
  })
})

describe("setPlanStatus", () => {
  it("changes only the user's enrollment", async () => {
    const fake = fakeDb()
    fake.planEnrollment.updateMany.mockResolvedValue({ count: 1 })
    expect(await setPlanStatus(fake.db, "user-1", "plan-1", "PAUSED")).toBe(
      true
    )
    expect(fake.planEnrollment.updateMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", userId: "user-1" },
      data: { status: "PAUSED" },
    })
  })

  it("refuses a plan the user does not follow", async () => {
    const fake = fakeDb()
    fake.planEnrollment.updateMany.mockResolvedValue({ count: 0 })
    expect(await setPlanStatus(fake.db, "intruder", "plan-1", "ARCHIVED")).toBe(
      false
    )
  })
})

describe("deletePlan", () => {
  it("deletes a plan the user owns", async () => {
    const fake = fakeDb()
    fake.readingPlan.deleteMany.mockResolvedValue({ count: 1 })
    expect(await deletePlan(fake.db, "user-1", "plan-1")).toBe(true)
    expect(fake.readingPlan.deleteMany).toHaveBeenCalledWith({
      where: { id: "plan-1", ownerId: "user-1" },
    })
    expect(fake.planEnrollment.deleteMany).not.toHaveBeenCalled()
  })

  it("only leaves a plan owned by someone else", async () => {
    const fake = fakeDb()
    fake.readingPlan.deleteMany.mockResolvedValue({ count: 0 })
    fake.planEnrollment.deleteMany.mockResolvedValue({ count: 1 })
    expect(await deletePlan(fake.db, "member-1", "plan-1")).toBe(true)
    expect(fake.planEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", userId: "member-1" },
    })
  })

  it("refuses a plan the user neither owns nor follows", async () => {
    const fake = fakeDb()
    fake.readingPlan.deleteMany.mockResolvedValue({ count: 0 })
    fake.planEnrollment.deleteMany.mockResolvedValue({ count: 0 })
    expect(await deletePlan(fake.db, "intruder", "plan-1")).toBe(false)
  })
})
