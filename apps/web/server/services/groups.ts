import "server-only"

import { randomInt } from "node:crypto"

import {
  canChangeRoles,
  canDeleteGroup,
  canManageMembers,
  canRemoveMember,
  generateInviteCode,
  maxGroupsPerUser,
  maxMembersPerGroup,
  normalizeInviteCode,
  type GroupInput,
  type GroupRole,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type GroupsDb = Pick<
  PrismaClient,
  | "group"
  | "groupMember"
  | "readingPlan"
  | "planEnrollment"
  | "prayerRequest"
  | "$transaction"
>

/**
 * Why something was refused. A group that does not exist and a group the
 * person does not belong to are the same answer, "notFound": a non-member
 * learns nothing about it.
 */
export type GroupError =
  | "notFound"
  | "forbidden"
  | "limit"
  | "full"
  | "invalidCode"
  | "ownerMustHandOver"

type Outcome = Promise<{ ok: true } | { ok: false; error: GroupError }>

export type GroupSummary = {
  id: string
  name: string
  description: string | null
  role: GroupRole
  memberCount: number
}

export type GroupMemberView = {
  userId: string
  name: string
  role: GroupRole
  joinedAt: Date
}

export type GroupDetail = {
  id: string
  name: string
  description: string | null
  /** The code to join with: only those who manage members get it. */
  inviteCode: string | null
  role: GroupRole
  members: GroupMemberView[]
}

const roleOrder: Record<GroupRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 }

/** The role of a person in a group, or null if they are not a member. */
export async function roleOf(
  db: Pick<PrismaClient, "groupMember">,
  userId: string,
  groupId: string
): Promise<GroupRole | null> {
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  )
}

const newInviteCode = () => generateInviteCode(randomInt)

/** Creates a group with its creator as owner. */
export async function createGroup(
  db: GroupsDb,
  userId: string,
  input: GroupInput
): Promise<{ ok: true; id: string } | { ok: false; error: GroupError }> {
  const joined = await db.groupMember.count({ where: { userId } })
  if (joined >= maxGroupsPerUser) return { ok: false, error: "limit" }

  // A code is rarely taken twice; if it is, draw another.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const group = await db.group.create({
        data: {
          name: input.name,
          description: input.description,
          inviteCode: newInviteCode(),
          members: { create: { userId, role: "OWNER" } },
        },
        select: { id: true },
      })
      return { ok: true, id: group.id }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new Error("Could not find a free invitation code")
}

/** The groups of a person, with their role and the size of each. */
export async function listGroups(
  db: Pick<PrismaClient, "groupMember">,
  userId: string
): Promise<GroupSummary[]> {
  const rows = await db.groupMember.findMany({
    where: { userId },
    select: {
      role: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  })
  return rows.map(({ role, group }) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    role,
    memberCount: group._count.members,
  }))
}

/**
 * A group and its members, for one of its members; null for anybody else.
 * Members are shown by name only (no email address).
 */
export async function getGroup(
  db: Pick<PrismaClient, "group" | "groupMember">,
  userId: string,
  groupId: string
): Promise<GroupDetail | null> {
  const role = await roleOf(db, userId, groupId)
  if (!role) return null

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      description: true,
      inviteCode: true,
      members: {
        select: {
          userId: true,
          role: true,
          joinedAt: true,
          user: { select: { name: true } },
        },
      },
    },
  })
  if (!group) return null

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: canManageMembers(role) ? group.inviteCode : null,
    role,
    members: group.members
      .map((member) => ({
        userId: member.userId,
        name: member.user.name,
        role: member.role,
        joinedAt: member.joinedAt,
      }))
      .sort(
        (a, b) =>
          roleOrder[a.role] - roleOrder[b.role] ||
          a.joinedAt.getTime() - b.joinedAt.getTime()
      ),
  }
}

/** What a person sees of a group before joining it: its name and its size. */
export async function previewInvite(
  db: Pick<PrismaClient, "group">,
  code: string
): Promise<{
  id: string
  name: string
  description: string | null
  memberCount: number
} | null> {
  const inviteCode = normalizeInviteCode(code)
  if (!inviteCode) return null
  const group = await db.group.findUnique({
    where: { inviteCode },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { members: true } },
    },
  })
  return group
    ? {
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: group._count.members,
      }
    : null
}

/**
 * Joins a group with its code. Joining a group one already belongs to is not
 * an error: the person is simply taken to it.
 */
export async function joinGroup(
  db: Pick<
    PrismaClient,
    "group" | "groupMember" | "readingPlan" | "planEnrollment"
  >,
  userId: string,
  code: string
): Promise<
  { ok: true; groupId: string; already: boolean } | { ok: false; error: GroupError }
> {
  const inviteCode = normalizeInviteCode(code)
  if (!inviteCode) return { ok: false, error: "invalidCode" }
  const group = await db.group.findUnique({
    where: { inviteCode },
    select: { id: true, _count: { select: { members: true } } },
  })
  if (!group) return { ok: false, error: "notFound" }

  if (await roleOf(db, userId, group.id)) {
    return { ok: true, groupId: group.id, already: true }
  }
  if (group._count.members >= maxMembersPerGroup) {
    return { ok: false, error: "full" }
  }
  if ((await db.groupMember.count({ where: { userId } })) >= maxGroupsPerUser) {
    return { ok: false, error: "limit" }
  }
  try {
    await db.groupMember.create({
      data: { groupId: group.id, userId, role: "MEMBER" },
    })
  } catch (error) {
    // Two taps on "join" at once: the second one finds the first's work.
    if (!isUniqueViolation(error)) throw error
    return { ok: true, groupId: group.id, already: true }
  }
  // The plans of the group are followed by all its members.
  await enrollInGroupPlans(db, group.id, userId)
  return { ok: true, groupId: group.id, already: false }
}

/** Makes a person follow every plan of a group (those they follow already stay as they are). */
export async function enrollInGroupPlans(
  db: Pick<PrismaClient, "readingPlan" | "planEnrollment">,
  groupId: string,
  userId: string
): Promise<void> {
  const plans = await db.readingPlan.findMany({
    where: { groupId },
    select: { id: true },
  })
  if (plans.length === 0) return
  await db.planEnrollment.createMany({
    data: plans.map((plan) => ({ planId: plan.id, userId })),
    skipDuplicates: true,
  })
}

/**
 * What a person leaves behind when they are no longer in a group: they stop
 * following its plans, and the prayer requests they had shared with it are
 * private again (nobody there can see them any more).
 */
async function leaveGroupPlans(
  db: Pick<PrismaClient, "planEnrollment" | "prayerRequest">,
  groupId: string,
  userId: string
): Promise<void> {
  await db.planEnrollment.deleteMany({
    where: { userId, plan: { groupId } },
  })
  await db.prayerRequest.updateMany({
    where: { userId, groupId },
    data: { groupId: null },
  })
}

/** A new code: the links and codes given out until now stop working. */
export async function regenerateInviteCode(
  db: GroupsDb,
  actorId: string,
  groupId: string
): Promise<{ ok: true; inviteCode: string } | { ok: false; error: GroupError }> {
  const role = await roleOf(db, actorId, groupId)
  if (!role) return { ok: false, error: "notFound" }
  if (!canManageMembers(role)) return { ok: false, error: "forbidden" }

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = newInviteCode()
    try {
      await db.group.update({ where: { id: groupId }, data: { inviteCode } })
      return { ok: true, inviteCode }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new Error("Could not find a free invitation code")
}

/** Removes a member, if the role of the actor allows it. */
export async function removeMember(
  db: Pick<PrismaClient, "groupMember" | "planEnrollment" | "prayerRequest">,
  actorId: string,
  groupId: string,
  memberId: string
): Outcome {
  const actorRole = await roleOf(db, actorId, groupId)
  if (!actorRole) return { ok: false, error: "notFound" }
  const targetRole = await roleOf(db, memberId, groupId)
  if (!targetRole) return { ok: false, error: "notFound" }
  if (actorId === memberId || !canRemoveMember(actorRole, targetRole)) {
    return { ok: false, error: "forbidden" }
  }
  await db.groupMember.delete({
    where: { groupId_userId: { groupId, userId: memberId } },
  })
  await leaveGroupPlans(db, groupId, memberId)
  return { ok: true }
}

/**
 * Leaves a group. The owner cannot walk away from people who still depend on
 * the group: they hand it over first (or delete it); alone, leaving deletes it.
 */
export async function leaveGroup(
  db: Pick<
    PrismaClient,
    "group" | "groupMember" | "planEnrollment" | "prayerRequest"
  >,
  userId: string,
  groupId: string
): Outcome {
  const role = await roleOf(db, userId, groupId)
  if (!role) return { ok: false, error: "notFound" }

  if (role === "OWNER") {
    const others = await db.groupMember.count({
      where: { groupId, userId: { not: userId } },
    })
    if (others > 0) return { ok: false, error: "ownerMustHandOver" }
    await db.group.delete({ where: { id: groupId } })
    return { ok: true }
  }
  await db.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  })
  await leaveGroupPlans(db, groupId, userId)
  return { ok: true }
}

/**
 * Changes the role of another member. Only the owner does it; making someone
 * owner hands the group over, and the previous owner becomes administrator.
 */
export async function setMemberRole(
  db: GroupsDb,
  actorId: string,
  groupId: string,
  memberId: string,
  role: GroupRole
): Outcome {
  const actorRole = await roleOf(db, actorId, groupId)
  if (!actorRole) return { ok: false, error: "notFound" }
  if (!canChangeRoles(actorRole)) return { ok: false, error: "forbidden" }
  if ((await roleOf(db, memberId, groupId)) === null) {
    return { ok: false, error: "notFound" }
  }
  if (actorId === memberId) return { ok: false, error: "forbidden" }

  const where = (userId: string) => ({
    groupId_userId: { groupId, userId },
  })
  if (role === "OWNER") {
    await db.$transaction([
      db.groupMember.update({ where: where(memberId), data: { role: "OWNER" } }),
      db.groupMember.update({ where: where(actorId), data: { role: "ADMIN" } }),
    ])
  } else {
    await db.groupMember.update({ where: where(memberId), data: { role } })
  }
  return { ok: true }
}

export async function deleteGroup(
  db: Pick<PrismaClient, "group" | "groupMember">,
  actorId: string,
  groupId: string
): Outcome {
  const role = await roleOf(db, actorId, groupId)
  if (!role) return { ok: false, error: "notFound" }
  if (!canDeleteGroup(role)) return { ok: false, error: "forbidden" }
  await db.group.delete({ where: { id: groupId } })
  return { ok: true }
}
