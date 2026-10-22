import { describe, expect, it, vi } from "vitest"

import { maxGroupsPerUser, maxMembersPerGroup } from "@workspace/core"

import {
  createGroup,
  deleteGroup,
  getGroup,
  joinGroup,
  leaveGroup,
  regenerateInviteCode,
  removeMember,
  setMemberRole,
  type GroupsDb,
} from "./groups"

type Role = "OWNER" | "ADMIN" | "MEMBER"

/**
 * A fake database holding the members of one group: who is in it, with which
 * role. Only what the services call is there.
 */
function fake(members: Record<string, Role>, extra: Record<string, unknown> = {}) {
  const groupMember = {
    findUnique: vi.fn(
      async ({ where }: { where: { groupId_userId: { userId: string } } }) => {
        const role = members[where.groupId_userId.userId]
        return role ? { role } : null
      }
    ),
    count: vi.fn(async ({ where }: { where: { userId?: unknown } }) =>
      typeof where.userId === "string"
        ? Number(where.userId in members) * 0
        : Object.keys(members).length - 1
    ),
    delete: vi.fn().mockResolvedValue({}),
    update: vi.fn((args) => args),
    create: vi.fn().mockResolvedValue({}),
  }
  const group = {
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "g1" }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  }
  const readingPlan = { findMany: vi.fn().mockResolvedValue([]) }
  const planEnrollment = {
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  }
  const transaction = vi.fn(async (operations: unknown[]) => operations)
  return {
    db: {
      group,
      groupMember,
      readingPlan,
      planEnrollment,
      $transaction: transaction,
      ...extra,
    } as unknown as GroupsDb,
    group,
    groupMember,
    readingPlan,
    planEnrollment,
    transaction,
  }
}

describe("getGroup", () => {
  const row = (role: Role) => ({
    id: "g1",
    name: "Cellule",
    description: null,
    inviteCode: "ABCDEFGH",
    members: [
      {
        userId: "u-member",
        role: "MEMBER",
        joinedAt: new Date("2026-10-02"),
        user: { name: "Marie" },
      },
      {
        userId: "u-owner",
        role: "OWNER",
        joinedAt: new Date("2026-10-01"),
        user: { name: "Paul" },
      },
      {
        userId: "u-admin",
        role: "ADMIN",
        joinedAt: new Date("2026-10-03"),
        user: { name: "Ruth" },
      },
    ],
    _role: role,
  })

  it("shows nothing to somebody who is not a member", async () => {
    const { db, group } = fake({ "u-owner": "OWNER" })
    expect(await getGroup(db, "stranger", "g1")).toBeNull()
    expect(group.findUnique).not.toHaveBeenCalled()
  })

  it("gives the members, the owner first, by name only", async () => {
    const { db, group } = fake({ "u-owner": "OWNER" })
    group.findUnique.mockResolvedValue(row("OWNER"))
    const detail = await getGroup(db, "u-owner", "g1")
    expect(detail?.members.map((member) => member.name)).toEqual([
      "Paul",
      "Ruth",
      "Marie",
    ])
    expect(JSON.stringify(detail)).not.toContain("@")
  })

  it("gives the invitation code to those who manage members, not to the others", async () => {
    const admin = fake({ "u-admin": "ADMIN" })
    admin.group.findUnique.mockResolvedValue(row("ADMIN"))
    expect((await getGroup(admin.db, "u-admin", "g1"))?.inviteCode).toBe(
      "ABCDEFGH"
    )
    const member = fake({ "u-member": "MEMBER" })
    member.group.findUnique.mockResolvedValue(row("MEMBER"))
    expect((await getGroup(member.db, "u-member", "g1"))?.inviteCode).toBeNull()
  })
})

describe("createGroup", () => {
  it("makes the creator the owner and draws an invitation code", async () => {
    const { db, group, groupMember } = fake({})
    groupMember.count.mockResolvedValue(0)
    const result = await createGroup(db, "u1", { name: "Famille", description: null })
    expect(result).toEqual({ ok: true, id: "g1" })
    const data = group.create.mock.calls[0]![0].data
    expect(data.members).toEqual({ create: { userId: "u1", role: "OWNER" } })
    expect(data.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
  })

  it("draws another code when one is already taken", async () => {
    const { db, group, groupMember } = fake({})
    groupMember.count.mockResolvedValue(0)
    group.create
      .mockRejectedValueOnce(Object.assign(new Error("taken"), { code: "P2002" }))
      .mockResolvedValue({ id: "g2" })
    expect(
      await createGroup(db, "u1", { name: "Famille", description: null })
    ).toEqual({ ok: true, id: "g2" })
    expect(group.create).toHaveBeenCalledTimes(2)
  })

  it("stops at the limit of groups", async () => {
    const { db, group, groupMember } = fake({})
    groupMember.count.mockResolvedValue(maxGroupsPerUser)
    expect(
      await createGroup(db, "u1", { name: "Une de plus", description: null })
    ).toEqual({ ok: false, error: "limit" })
    expect(group.create).not.toHaveBeenCalled()
  })
})

describe("joinGroup", () => {
  it("joins with a code however it was typed", async () => {
    const { db, group, groupMember } = fake({})
    group.findUnique.mockResolvedValue({ id: "g1", _count: { members: 3 } })
    groupMember.count.mockResolvedValue(0)
    expect(await joinGroup(db, "u1", "abcd-efgh")).toEqual({
      ok: true,
      groupId: "g1",
      already: false,
    })
    expect(group.findUnique.mock.calls[0]![0].where).toEqual({
      inviteCode: "ABCDEFGH",
    })
    expect(groupMember.create).toHaveBeenCalledWith({
      data: { groupId: "g1", userId: "u1", role: "MEMBER" },
    })
  })

  it("takes a person already in the group to it, without adding them twice", async () => {
    const { db, group, groupMember } = fake({ u1: "MEMBER" })
    group.findUnique.mockResolvedValue({ id: "g1", _count: { members: 3 } })
    expect(await joinGroup(db, "u1", "ABCDEFGH")).toEqual({
      ok: true,
      groupId: "g1",
      already: true,
    })
    expect(groupMember.create).not.toHaveBeenCalled()
  })

  it("refuses a code that does not exist or cannot be a code", async () => {
    const { db, group } = fake({})
    group.findUnique.mockResolvedValue(null)
    expect(await joinGroup(db, "u1", "ABCDEFGH")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(await joinGroup(db, "u1", "nope")).toEqual({
      ok: false,
      error: "invalidCode",
    })
  })

  it("refuses a full group", async () => {
    const { db, group, groupMember } = fake({})
    group.findUnique.mockResolvedValue({
      id: "g1",
      _count: { members: maxMembersPerGroup },
    })
    expect(await joinGroup(db, "u1", "ABCDEFGH")).toEqual({
      ok: false,
      error: "full",
    })
    expect(groupMember.create).not.toHaveBeenCalled()
  })
})

describe("plans of the group", () => {
  it("makes a new member follow the plans of the group", async () => {
    const { db, group, groupMember, readingPlan, planEnrollment } = fake({})
    group.findUnique.mockResolvedValue({ id: "g1", _count: { members: 3 } })
    groupMember.count.mockResolvedValue(0)
    readingPlan.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }])
    await joinGroup(db, "u1", "ABCDEFGH")
    expect(planEnrollment.createMany).toHaveBeenCalledWith({
      data: [
        { planId: "p1", userId: "u1" },
        { planId: "p2", userId: "u1" },
      ],
      skipDuplicates: true,
    })
  })

  it("does not enroll somebody who was already in the group", async () => {
    const { db, group, planEnrollment } = fake({ u1: "MEMBER" })
    group.findUnique.mockResolvedValue({ id: "g1", _count: { members: 3 } })
    await joinGroup(db, "u1", "ABCDEFGH")
    expect(planEnrollment.createMany).not.toHaveBeenCalled()
  })

  it("stops a removed member, or one who leaves, from following them", async () => {
    const removed = fake({ a: "ADMIN", m: "MEMBER" })
    await removeMember(removed.db, "a", "g1", "m")
    expect(removed.planEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { userId: "m", plan: { groupId: "g1" } },
    })
    const left = fake({ m: "MEMBER", o: "OWNER" })
    await leaveGroup(left.db, "m", "g1")
    expect(left.planEnrollment.deleteMany).toHaveBeenCalledWith({
      where: { userId: "m", plan: { groupId: "g1" } },
    })
  })
})

describe("who manages members", () => {
  it("lets an administrator make a new code, and refuses a plain member", async () => {
    const admin = fake({ a: "ADMIN" })
    const result = await regenerateInviteCode(admin.db, "a", "g1")
    expect(result.ok).toBe(true)
    expect(admin.group.update).toHaveBeenCalled()

    const member = fake({ m: "MEMBER" })
    expect(await regenerateInviteCode(member.db, "m", "g1")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(member.group.update).not.toHaveBeenCalled()
  })

  it("tells a stranger the group does not exist", async () => {
    const { db, group } = fake({ a: "ADMIN" })
    expect(await regenerateInviteCode(db, "stranger", "g1")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(group.update).not.toHaveBeenCalled()
  })

  it("lets an administrator remove a plain member, not the owner or another administrator", async () => {
    const { db, groupMember } = fake({ a: "ADMIN", b: "ADMIN", m: "MEMBER", o: "OWNER" })
    expect(await removeMember(db, "a", "g1", "m")).toEqual({ ok: true })
    expect(groupMember.delete).toHaveBeenCalledTimes(1)
    for (const target of ["b", "o"]) {
      expect(await removeMember(db, "a", "g1", target)).toEqual({
        ok: false,
        error: "forbidden",
      })
    }
    expect(groupMember.delete).toHaveBeenCalledTimes(1)
  })

  it("refuses a plain member who tries to remove somebody", async () => {
    const { db, groupMember } = fake({ m: "MEMBER", n: "MEMBER" })
    expect(await removeMember(db, "m", "g1", "n")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(groupMember.delete).not.toHaveBeenCalled()
  })

  it("does not remove a member of another group by their id", async () => {
    const { db, groupMember } = fake({ a: "ADMIN" })
    expect(await removeMember(db, "a", "g1", "somebody-else")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(groupMember.delete).not.toHaveBeenCalled()
  })
})

describe("leaveGroup", () => {
  it("lets a member leave", async () => {
    const { db, groupMember } = fake({ m: "MEMBER", o: "OWNER" })
    expect(await leaveGroup(db, "m", "g1")).toEqual({ ok: true })
    expect(groupMember.delete).toHaveBeenCalled()
  })

  it("does not let the owner leave people behind", async () => {
    const { db, group, groupMember } = fake({ o: "OWNER", m: "MEMBER" })
    expect(await leaveGroup(db, "o", "g1")).toEqual({
      ok: false,
      error: "ownerMustHandOver",
    })
    expect(group.delete).not.toHaveBeenCalled()
    expect(groupMember.delete).not.toHaveBeenCalled()
  })

  it("deletes the group when its owner is alone in it and leaves", async () => {
    const { db, group } = fake({ o: "OWNER" })
    expect(await leaveGroup(db, "o", "g1")).toEqual({ ok: true })
    expect(group.delete).toHaveBeenCalledWith({ where: { id: "g1" } })
  })
})

describe("roles and deletion", () => {
  it("lets only the owner change roles", async () => {
    const owner = fake({ o: "OWNER", m: "MEMBER" })
    expect(await setMemberRole(owner.db, "o", "g1", "m", "ADMIN")).toEqual({
      ok: true,
    })
    const admin = fake({ a: "ADMIN", m: "MEMBER" })
    expect(await setMemberRole(admin.db, "a", "g1", "m", "ADMIN")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(admin.groupMember.update).not.toHaveBeenCalled()
  })

  it("hands the group over: the new owner, and the old one becomes administrator", async () => {
    const { db, groupMember, transaction } = fake({ o: "OWNER", m: "MEMBER" })
    expect(await setMemberRole(db, "o", "g1", "m", "OWNER")).toEqual({ ok: true })
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(groupMember.update.mock.calls.map(([args]) => [args.where.groupId_userId.userId, args.data.role])).toEqual([
      ["m", "OWNER"],
      ["o", "ADMIN"],
    ])
  })

  it("lets only the owner delete the group", async () => {
    const owner = fake({ o: "OWNER" })
    expect(await deleteGroup(owner.db, "o", "g1")).toEqual({ ok: true })
    const admin = fake({ a: "ADMIN" })
    expect(await deleteGroup(admin.db, "a", "g1")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(admin.group.delete).not.toHaveBeenCalled()
  })
})
