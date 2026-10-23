import { describe, expect, it, vi } from "vitest"

import {
  canShareWith,
  listGroupPrayers,
  togglePraying,
  type GroupPrayersDb,
} from "./group-prayers"

type Role = "OWNER" | "ADMIN" | "MEMBER"

function fake(members: Record<string, Role>) {
  const groupMember = {
    findUnique: vi.fn(
      async ({ where }: { where: { groupId_userId: { userId: string } } }) => {
        const role = members[where.groupId_userId.userId]
        return role ? { role } : null
      }
    ),
  }
  const prayerRequest = {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
  }
  const prayerSupport = {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(1),
  }
  return {
    db: { groupMember, prayerRequest, prayerSupport } as unknown as GroupPrayersDb,
    groupMember,
    prayerRequest,
    prayerSupport,
  }
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  title: "Pour ma famille",
  details: null,
  category: "FAMILY",
  status: "ACTIVE",
  passages: [],
  answeredOn: null,
  userId: "author",
  user: { name: "Marie" },
  _count: { supports: 2 },
  supports: [],
  ...overrides,
})

describe("canShareWith", () => {
  it("is for the members of the group", async () => {
    const { db } = fake({ a: "MEMBER" })
    expect(await canShareWith(db, "a", "g1")).toBe(true)
    expect(await canShareWith(db, "stranger", "g1")).toBe(false)
  })
})

describe("listGroupPrayers", () => {
  it("shows nothing to somebody who is not in the group", async () => {
    const { db, prayerRequest } = fake({ a: "MEMBER" })
    expect(await listGroupPrayers(db, "stranger", "g1")).toBeNull()
    expect(prayerRequest.findMany).not.toHaveBeenCalled()
  })

  it("asks only for the requests shared with this group, active or answered", async () => {
    const { db, prayerRequest } = fake({ a: "MEMBER" })
    await listGroupPrayers(db, "a", "g1")
    const args = prayerRequest.findMany.mock.calls[0]![0]
    // A private request has no group: it can never match.
    expect(args.where).toEqual({
      groupId: "g1",
      status: { in: ["ACTIVE", "ANSWERED"] },
    })
  })

  it("never asks for the answer note, the journal or the e-mail of the author", async () => {
    const { db, prayerRequest } = fake({ a: "MEMBER" })
    await listGroupPrayers(db, "a", "g1")
    const select = prayerRequest.findMany.mock.calls[0]![0].select
    expect(select).not.toHaveProperty("answerNote")
    expect(select).not.toHaveProperty("lastPrayedAt")
    expect(select).not.toHaveProperty("prayerCount")
    expect(select.user).toEqual({ select: { name: true } })
  })

  it("counts the supports, knows mine, and puts the answered ones last", async () => {
    const { db, prayerRequest } = fake({ a: "MEMBER" })
    prayerRequest.findMany.mockResolvedValue([
      row({
        id: "answered",
        status: "ANSWERED",
        answeredOn: new Date("2026-10-20T00:00:00Z"),
      }),
      row({ id: "active", supports: [{ userId: "a" }] }),
    ])
    const prayers = await listGroupPrayers(db, "a", "g1")
    expect(prayers?.map((prayer) => prayer.id)).toEqual(["active", "answered"])
    expect(prayers?.[0]).toMatchObject({
      supportCount: 2,
      supportedByMe: true,
      authorName: "Marie",
    })
    expect(prayers?.[1]!.answeredOn).toBe("2026-10-20")
    expect(prayers?.[1]!.supportedByMe).toBe(false)
  })
})

describe("togglePraying", () => {
  const shared = { userId: "author", groupId: "g1", status: "ACTIVE" }

  it("adds my support to a shared request, and gives the new count", async () => {
    const { db, prayerRequest, prayerSupport } = fake({ a: "MEMBER" })
    prayerRequest.findUnique.mockResolvedValue(shared)
    prayerSupport.count.mockResolvedValue(3)
    expect(await togglePraying(db, "a", "r1")).toEqual({
      ok: true,
      praying: true,
      supportCount: 3,
    })
    expect(prayerSupport.create).toHaveBeenCalledWith({
      data: { requestId: "r1", userId: "a" },
    })
  })

  it("takes it back when it is already there", async () => {
    const { db, prayerRequest, prayerSupport } = fake({ a: "MEMBER" })
    prayerRequest.findUnique.mockResolvedValue(shared)
    prayerSupport.findUnique.mockResolvedValue({ id: "s1" })
    prayerSupport.count.mockResolvedValue(1)
    expect(await togglePraying(db, "a", "r1")).toEqual({
      ok: true,
      praying: false,
      supportCount: 1,
    })
    expect(prayerSupport.delete).toHaveBeenCalledWith({ where: { id: "s1" } })
    expect(prayerSupport.create).not.toHaveBeenCalled()
  })

  it("does not count a second time when two taps arrive together", async () => {
    const { db, prayerRequest, prayerSupport } = fake({ a: "MEMBER" })
    prayerRequest.findUnique.mockResolvedValue(shared)
    prayerSupport.create.mockRejectedValue(
      Object.assign(new Error("taken"), { code: "P2002" })
    )
    expect((await togglePraying(db, "a", "r1")).ok).toBe(true)
  })

  it("is not there for a private request", async () => {
    const { db, prayerRequest, prayerSupport } = fake({ a: "MEMBER" })
    prayerRequest.findUnique.mockResolvedValue({ ...shared, groupId: null })
    expect(await togglePraying(db, "a", "r1")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(prayerSupport.create).not.toHaveBeenCalled()
  })

  it("is not there for somebody outside the group it is shared with", async () => {
    const { db, prayerRequest, prayerSupport } = fake({ a: "MEMBER" })
    prayerRequest.findUnique.mockResolvedValue(shared)
    expect(await togglePraying(db, "stranger", "r1")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(prayerSupport.create).not.toHaveBeenCalled()
  })

  it("refuses to pray for one's own request, or for a request that is not active", async () => {
    const own = fake({ author: "MEMBER" })
    own.prayerRequest.findUnique.mockResolvedValue(shared)
    expect(await togglePraying(own.db, "author", "r1")).toEqual({
      ok: false,
      error: "forbidden",
    })
    const answered = fake({ a: "MEMBER" })
    answered.prayerRequest.findUnique.mockResolvedValue({
      ...shared,
      status: "ANSWERED",
    })
    expect(await togglePraying(answered.db, "a", "r1")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(own.prayerSupport.create).not.toHaveBeenCalled()
    expect(answered.prayerSupport.create).not.toHaveBeenCalled()
  })

  it("is not there when the request does not exist", async () => {
    const { db, prayerRequest } = fake({ a: "MEMBER" })
    prayerRequest.findUnique.mockResolvedValue(null)
    expect(await togglePraying(db, "a", "nope")).toEqual({
      ok: false,
      error: "notFound",
    })
  })
})
