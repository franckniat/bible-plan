import { describe, expect, it, vi } from "vitest"

import { legalVersion } from "@workspace/core"

import {
  acceptTerms,
  deleteAccount,
  needsConsent,
  type AccountDb,
} from "./account"

describe("needsConsent", () => {
  it("asks for the current version only", () => {
    expect(needsConsent({ termsVersion: null })).toBe(true)
    expect(needsConsent({ termsVersion: "2020-01-01" })).toBe(true)
    expect(needsConsent({ termsVersion: legalVersion })).toBe(false)
  })
})

describe("acceptTerms", () => {
  it("records the date and the version", async () => {
    const update = vi.fn()
    const now = new Date("2026-10-23T10:00:00Z")
    await acceptTerms({ user: { update } } as never, "u1", now)
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { termsAcceptedAt: now, termsVersion: legalVersion },
    })
  })
})

function accountDb() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: " Ann@Example.com " }),
      delete: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue({ userId: "owner" }),
    },
    group: { deleteMany: vi.fn() },
    readingPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    waitlistEntry: { deleteMany: vi.fn() },
    syncTombstone: { deleteMany: vi.fn() },
  }
}

describe("deleteAccount", () => {
  it("deletes the user and their waitlist entry", async () => {
    const db = accountDb()
    expect(await deleteAccount(db as unknown as AccountDb, "u1")).toEqual({
      ok: true,
    })
    expect(db.waitlistEntry.deleteMany).toHaveBeenCalledWith({
      where: { email: "ann@example.com" },
    })
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } })
    // Its tombstones are of no use once the account is gone.
    expect(db.syncTombstone.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    })
  })

  it("refuses while the person owns a group with other members", async () => {
    const db = accountDb()
    db.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }])
    db.groupMember.count.mockResolvedValue(2)
    expect(await deleteAccount(db as unknown as AccountDb, "u1")).toEqual({
      ok: false,
      error: "ownsGroup",
    })
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it("gives the group plans they made to the group owner", async () => {
    const db = accountDb()
    db.readingPlan.findMany.mockResolvedValue([{ id: "p1", groupId: "g2" }])
    await deleteAccount(db as unknown as AccountDb, "u1")
    expect(db.readingPlan.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { ownerId: "owner" },
    })
  })

  it("does nothing for an unknown user", async () => {
    const db = accountDb()
    db.user.findUnique.mockResolvedValue(null)
    expect(await deleteAccount(db as unknown as AccountDb, "x")).toEqual({
      ok: false,
      error: "notFound",
    })
  })
})
