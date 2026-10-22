import { describe, expect, it, vi } from "vitest"

import {
  newPlanSchema,
  parseReference,
  PlanGenerationError,
} from "@workspace/core"

import {
  applyCatchUp,
  createPlan,
  deletePlan,
  fromDbDate,
  getPlan,
  getReadingForUser,
  getTodayPlans,
  listPlans,
  setCatchUpStrategy,
  setPlanStatus,
  setReadingProgress,
  toDbDate,
  type PlansDb,
} from "./plans"

/** A fake client whose transaction runs the callback on the same mocks. */
function fakeDb() {
  const mocks = {
    readingPlan: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    planDay: { createMany: vi.fn() },
    planReading: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    planEnrollment: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    readingProgress: { createMany: vi.fn(), deleteMany: vi.fn() },
    $executeRaw: vi.fn(),
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
    expect(fake.planEnrollment.createMany).toHaveBeenCalledWith({
      data: [{ planId: id, userId: "user-1" }],
    })
  })

  it("follows a plan for a group with every member, on the FREE strategy", async () => {
    const fake = fakeDb()
    const { id } = await createPlan(
      fake.db,
      "manager",
      templatePlan("mcheyne-1-year", 30),
      "fr",
      { id: "group-1", memberIds: ["manager", "marie", "paul"] }
    )
    const plan = fake.readingPlan.create.mock.calls[0]![0].data
    expect(plan).toMatchObject({
      ownerId: "manager",
      groupId: "group-1",
      catchUpStrategy: "FREE",
    })
    // The creator is one of the members: enrolled once.
    expect(fake.planEnrollment.createMany).toHaveBeenCalledWith({
      data: [
        { planId: id, userId: "manager" },
        { planId: id, userId: "marie" },
        { planId: id, userId: "paul" },
      ],
    })
  })

  it("keeps a personal plan out of any group", async () => {
    const fake = fakeDb()
    await createPlan(fake.db, "user-1", templatePlan("mcheyne-1-year", 30), "fr")
    const plan = fake.readingPlan.create.mock.calls[0]![0].data
    expect(plan).not.toHaveProperty("groupId")
    expect(plan).not.toHaveProperty("catchUpStrategy")
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
  const found = (
    ownerId: string,
    group: { members: { role: string }[] } | null = null
  ) => ({ ownerId, group })

  it("deletes a plan the user owns", async () => {
    const fake = fakeDb()
    fake.readingPlan.findUnique.mockResolvedValue(found("user-1"))
    expect(await deletePlan(fake.db, "user-1", "plan-1")).toBe(true)
    expect(fake.readingPlan.delete).toHaveBeenCalledWith({
      where: { id: "plan-1" },
    })
    expect(fake.planEnrollment.deleteMany).not.toHaveBeenCalled()
  })

  it("only leaves a plan owned by someone else", async () => {
    const fake = fakeDb()
    fake.readingPlan.findUnique.mockResolvedValue(found("owner"))
    fake.planEnrollment.deleteMany.mockResolvedValue({ count: 1 })
    expect(await deletePlan(fake.db, "member-1", "plan-1")).toBe(true)
    expect(fake.readingPlan.delete).not.toHaveBeenCalled()
    expect(fake.planEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", userId: "member-1" },
    })
  })

  it("refuses a plan the user neither owns nor follows", async () => {
    const fake = fakeDb()
    fake.readingPlan.findUnique.mockResolvedValue(found("owner"))
    fake.planEnrollment.deleteMany.mockResolvedValue({ count: 0 })
    expect(await deletePlan(fake.db, "intruder", "plan-1")).toBe(false)
  })

  it("refuses a plan that does not exist", async () => {
    const fake = fakeDb()
    fake.readingPlan.findUnique.mockResolvedValue(null)
    expect(await deletePlan(fake.db, "user-1", "nope")).toBe(false)
    expect(fake.readingPlan.delete).not.toHaveBeenCalled()
  })

  it("lets a group's administrator delete the plan, not only its author", async () => {
    const fake = fakeDb()
    fake.readingPlan.findUnique.mockResolvedValue(
      found("author", { members: [{ role: "ADMIN" }] })
    )
    expect(await deletePlan(fake.db, "admin", "plan-1")).toBe(true)
    expect(fake.readingPlan.delete).toHaveBeenCalled()
  })

  it("does not let a plain member delete or leave a plan of the group", async () => {
    const fake = fakeDb()
    fake.readingPlan.findUnique.mockResolvedValue(
      found("author", { members: [{ role: "MEMBER" }] })
    )
    expect(await deletePlan(fake.db, "member", "plan-1")).toBe(false)
    expect(fake.readingPlan.delete).not.toHaveBeenCalled()
    expect(fake.planEnrollment.deleteMany).not.toHaveBeenCalled()
  })
})

describe("applyCatchUp", () => {
  /** Genesis 1-3 from January 1, one chapter a day, nothing read. */
  function lateEnrollment() {
    const day = (number: number, chapter: number, verses: number) => ({
      id: `day-${number}`,
      dayNumber: number,
      date: toDbDate(`2027-01-0${number}`),
      verses,
      readings: [
        {
          id: `reading-${number}`,
          track: 0,
          book: "Gen",
          startChapter: chapter,
          startVerse: 1,
          endChapter: chapter,
          endVerse: verses,
          verses,
          progress: [],
        },
      ],
    })
    return {
      id: "enrollment-1",
      status: "ACTIVE",
      plan: {
        id: "plan-1",
        title: "Genèse",
        templateKey: null,
        startDate: toDbDate("2027-01-01"),
        endDate: toDbDate("2027-01-03"),
        activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
        tracks: [{}],
        totalDays: 3,
        totalVerses: 80,
        totalReadings: 3,
        days: [day(1, 1, 31), day(2, 2, 25), day(3, 3, 24)],
      },
    }
  }

  it("refuses a plan the user does not follow", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(null)
    expect(
      await applyCatchUp(fake.db, "intruder", "plan-1", "SHIFT", "2027-01-03")
    ).toEqual({ ok: false, error: "not_found" })
  })

  it("only allows the free strategy on a shared plan", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(lateEnrollment())
    fake.planEnrollment.count.mockResolvedValue(2)
    expect(
      await applyCatchUp(fake.db, "user-1", "plan-1", "SHIFT", "2027-01-03")
    ).toEqual({ ok: false, error: "shared_plan" })
    expect(fake.$transaction).not.toHaveBeenCalled()
  })

  it("changes nothing with the free strategy", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(lateEnrollment())
    expect(
      await applyCatchUp(fake.db, "user-1", "plan-1", "FREE", "2027-01-03")
    ).toEqual({ ok: true, changed: false })
    expect(fake.$transaction).not.toHaveBeenCalled()
  })

  it("explains why it cannot redistribute after the end date", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(lateEnrollment())
    fake.planEnrollment.count.mockResolvedValue(1)
    expect(
      await applyCatchUp(
        fake.db,
        "user-1",
        "plan-1",
        "REDISTRIBUTE",
        "2027-01-10"
      )
    ).toEqual({ ok: false, error: "no_active_days" })
  })

  it("never deletes a reading that has progress", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findUnique.mockResolvedValue(lateEnrollment())
    fake.planEnrollment.count.mockResolvedValue(1)
    expect(
      await applyCatchUp(
        fake.db,
        "user-1",
        "plan-1",
        "REDISTRIBUTE",
        "2027-01-02"
      )
    ).toEqual({ ok: true, changed: true })
    expect(fake.$transaction).toHaveBeenCalledTimes(1)
    expect(fake.planReading.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["reading-1", "reading-2", "reading-3"] },
        day: { planId: "plan-1" },
        progress: { none: {} },
      },
    })
  })
})

describe("setCatchUpStrategy", () => {
  it("lets only the owner choose", async () => {
    const fake = fakeDb()
    fake.readingPlan.updateMany.mockResolvedValue({ count: 1 })
    expect(
      await setCatchUpStrategy(fake.db, "user-1", "plan-1", "REDISTRIBUTE")
    ).toBe(true)
    expect(fake.readingPlan.updateMany).toHaveBeenCalledWith({
      where: { id: "plan-1", ownerId: "user-1" },
      data: { catchUpStrategy: "REDISTRIBUTE" },
    })

    fake.readingPlan.updateMany.mockResolvedValue({ count: 0 })
    expect(
      await setCatchUpStrategy(fake.db, "member-1", "plan-1", "FREE")
    ).toBe(false)
  })
})

describe("getTodayPlans late readings", () => {
  it("counts the unread readings planned before the user's today", async () => {
    const fake = fakeDb()
    fake.planEnrollment.findMany.mockResolvedValue([
      {
        _count: { progress: 0 },
        plan: {
          id: "plan-1",
          title: "Genèse",
          tracks: [{}],
          totalReadings: 30,
          catchUpStrategy: "SHIFT",
          days: [],
        },
      },
    ])
    fake.planReading.count.mockResolvedValue(5)
    const [plan] = await getTodayPlans(fake.db, "user-1", "2027-01-06")

    expect(plan).toMatchObject({ lateReadings: 5, catchUpStrategy: "SHIFT" })
    expect(fake.planReading.count).toHaveBeenCalledWith({
      where: {
        day: { planId: "plan-1", date: { lt: toDbDate("2027-01-06") } },
        progress: { none: { enrollment: { userId: "user-1" } } },
      },
    })
  })
})

describe("getReadingForUser", () => {
  const row = (enrollments: { id: string }[]) => ({
    id: "reading-1",
    book: "John",
    startChapter: 3,
    startVerse: 1,
    endChapter: 3,
    endVerse: 36,
    progress: [],
    day: { plan: { id: "plan-1", title: "Jean", enrollments } },
  })

  it("returns a reading of the user's plans", async () => {
    const fake = fakeDb()
    fake.planReading.findUnique.mockResolvedValue(row([{ id: "enrollment-1" }]))
    expect(await getReadingForUser(fake.db, "user-1", "reading-1")).toEqual({
      id: "reading-1",
      passage: {
        book: "John",
        start: { chapter: 3, verse: 1 },
        end: { chapter: 3, verse: 36 },
      },
      completedAt: null,
      planId: "plan-1",
      planTitle: "Jean",
    })
  })

  it("refuses a reading of someone else's plan", async () => {
    const fake = fakeDb()
    fake.planReading.findUnique.mockResolvedValue(row([]))
    expect(await getReadingForUser(fake.db, "intruder", "reading-1")).toBeNull()
    fake.planReading.findUnique.mockResolvedValue(null)
    expect(await getReadingForUser(fake.db, "user-1", "nope")).toBeNull()
  })
})
