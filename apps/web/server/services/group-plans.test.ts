import { describe, expect, it, vi } from "vitest"

import { newPlanSchema } from "@workspace/core"

import {
  copyGroupPlan,
  createGroupPlan,
  listGroupPlans,
  type GroupPlansDb,
} from "./group-plans"
import { toDbDate, type PlansDb } from "./plans"

type Role = "OWNER" | "ADMIN" | "MEMBER"

const request = newPlanSchema.parse({
  source: "template",
  templateKey: "mcheyne-1-year",
  startDate: "2027-01-01",
  pace: { mode: "days", days: 30 },
})

/** A fake client: the members of one group, and the writes of the plan. */
function fake(members: Record<string, Role>) {
  const mocks = {
    group: {},
    groupMember: {
      findUnique: vi.fn(
        async ({ where }: { where: { groupId_userId: { userId: string } } }) => {
          const role = members[where.groupId_userId.userId]
          return role ? { role } : null
        }
      ),
      findMany: vi.fn(async () =>
        Object.keys(members).map((userId) => ({ userId }))
      ),
    },
    readingPlan: { create: vi.fn(), findMany: vi.fn() },
    planDay: { createMany: vi.fn() },
    planReading: { createMany: vi.fn() },
    planEnrollment: {
      createMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  }
  const $transaction = vi.fn(async (callback: (tx: typeof mocks) => unknown) =>
    callback(mocks)
  )
  return {
    db: { ...mocks, $transaction } as unknown as GroupPlansDb,
    ...mocks,
    $transaction,
  }
}

describe("createGroupPlan", () => {
  it("lets an administrator create a plan that all the members follow", async () => {
    const f = fake({ admin: "ADMIN", marie: "MEMBER", paul: "MEMBER" })
    const result = await createGroupPlan(f.db, "admin", "g1", request, "fr")
    expect(result.ok).toBe(true)
    expect(f.readingPlan.create.mock.calls[0]![0].data).toMatchObject({
      groupId: "g1",
      catchUpStrategy: "FREE",
    })
    const enrolled = f.planEnrollment.createMany.mock.calls[0]![0].data.map(
      (row: { userId: string }) => row.userId
    )
    expect(enrolled.sort()).toEqual(["admin", "marie", "paul"])
  })

  it("refuses a plain member", async () => {
    const f = fake({ marie: "MEMBER" })
    expect(await createGroupPlan(f.db, "marie", "g1", request, "fr")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(f.readingPlan.create).not.toHaveBeenCalled()
  })

  it("does not tell a stranger that the group exists", async () => {
    const f = fake({ marie: "MEMBER" })
    expect(await createGroupPlan(f.db, "stranger", "g1", request, "fr")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(f.readingPlan.create).not.toHaveBeenCalled()
  })
})

describe("listGroupPlans", () => {
  const plan = {
    id: "p1",
    title: "Les Évangiles",
    startDate: new Date("2027-01-01T00:00:00Z"),
    endDate: new Date("2027-01-30T00:00:00Z"),
    totalDays: 30,
    totalReadings: 60,
    enrollments: [
      { userId: "a", user: { name: "Zoé" }, _count: { progress: 10 } },
      { userId: "b", user: { name: "Paul" }, _count: { progress: 30 } },
      { userId: "c", user: { name: "Marie" }, _count: { progress: 10 } },
    ],
  }

  it("shows nothing to somebody who is not in the group", async () => {
    const f = fake({ a: "MEMBER" })
    expect(await listGroupPlans(f.db, "stranger", "g1")).toBeNull()
    expect(f.readingPlan.findMany).not.toHaveBeenCalled()
  })

  it("lists the members from the furthest, ties by name", async () => {
    const f = fake({ a: "MEMBER" })
    f.readingPlan.findMany.mockResolvedValue([plan])
    const plans = await listGroupPlans(f.db, "a", "g1")
    expect(plans?.[0]).toMatchObject({
      id: "p1",
      startDate: "2027-01-01",
      endDate: "2027-01-30",
      totalReadings: 60,
    })
    expect(plans?.[0]!.members.map((member) => member.name)).toEqual([
      "Paul",
      "Marie",
      "Zoé",
    ])
  })
})

describe("copyGroupPlan", () => {
  const source = {
    plan: {
      groupId: "g1",
      title: "Les Évangiles",
      templateKey: null,
      startDate: toDbDate("2027-01-01"),
      endDate: toDbDate("2027-01-02"),
      activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
      tracks: [{ passages: [] }],
      pace: { mode: "days", days: 2 },
      totalDays: 2,
      totalVerses: 20,
      totalReadings: 2,
      days: [
        {
          dayNumber: 1,
          date: toDbDate("2027-01-01"),
          verses: 10,
          readings: [
            {
              position: 0,
              track: 0,
              book: "Matt",
              startChapter: 1,
              startVerse: 1,
              endChapter: 1,
              endVerse: 10,
              verses: 10,
            },
          ],
        },
        {
          dayNumber: 2,
          date: toDbDate("2027-01-02"),
          verses: 10,
          readings: [
            {
              position: 0,
              track: 0,
              book: "Matt",
              startChapter: 1,
              startVerse: 11,
              endChapter: 1,
              endVerse: 20,
              verses: 10,
            },
          ],
        },
      ],
    },
  }

  it("copies the calendar into a personal plan of the member, without progress", async () => {
    const f = fake({})
    f.planEnrollment.findUnique.mockResolvedValue(source)
    const result = await copyGroupPlan(f.db as unknown as PlansDb, "marie", "p1")
    expect(result.ok).toBe(true)
    const created = f.readingPlan.create.mock.calls[0]![0].data
    expect(created).toMatchObject({
      ownerId: "marie",
      title: "Les Évangiles",
      totalDays: 2,
    })
    // A personal plan: no group.
    expect(created).not.toHaveProperty("groupId")
    expect(f.planDay.createMany.mock.calls[0]![0].data).toHaveLength(2)
    expect(f.planReading.createMany.mock.calls[0]![0].data).toHaveLength(2)
    expect(f.planEnrollment.create).toHaveBeenCalledWith({
      data: { planId: created.id, userId: "marie" },
    })
  })

  it("does not copy a plan the person does not follow", async () => {
    const f = fake({})
    f.planEnrollment.findUnique.mockResolvedValue(null)
    expect(await copyGroupPlan(f.db as unknown as PlansDb, "stranger", "p1")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(f.readingPlan.create).not.toHaveBeenCalled()
  })

  it("only copies plans of a group", async () => {
    const f = fake({})
    f.planEnrollment.findUnique.mockResolvedValue({
      plan: { ...source.plan, groupId: null },
    })
    expect(await copyGroupPlan(f.db as unknown as PlansDb, "marie", "p1")).toEqual({
      ok: false,
      error: "notFound",
    })
  })
})
