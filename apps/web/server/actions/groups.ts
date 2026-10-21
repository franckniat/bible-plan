"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { groupInputSchema, groupRoles } from "@workspace/core"
import { prisma } from "@workspace/db"

import {
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  regenerateInviteCode,
  removeMember,
  setMemberRole,
  type GroupError,
} from "@/server/services/groups"
import { requireUser } from "@/server/session"

/** Translated by the groups pages ("Groups.errors.<code>"). */
export type GroupActionError = GroupError | "invalid" | "unexpected"

const idSchema = z.uuid()

/** Runs a change of a group for the signed-in user, and refreshes the pages. */
async function run<T extends object>(
  work: (userId: string) => Promise<({ ok: true } & T) | { ok: false; error: GroupError }>
): Promise<({ ok: true } & T) | { error: GroupActionError }> {
  const user = await requireUser()
  try {
    const result = await work(user.id)
    if (!result.ok) return { error: result.error }
    revalidatePath("/[locale]/groups", "layout")
    return result
  } catch (error) {
    console.error("Group action failed", error)
    return { error: "unexpected" }
  }
}

export async function createGroupAction(request: unknown) {
  const parsed = groupInputSchema.safeParse(request)
  if (!parsed.success) return { error: "invalid" as const }
  return run((userId) => createGroup(prisma, userId, parsed.data))
}

/** Joins with a code typed by the person or taken from a link. */
export async function joinGroupAction(code: string) {
  if (typeof code !== "string" || code.length > 64) {
    return { error: "invalid" as const }
  }
  return run((userId) => joinGroup(prisma, userId, code))
}

export async function regenerateInviteCodeAction(groupId: string) {
  if (!idSchema.safeParse(groupId).success) return { error: "invalid" as const }
  return run((userId) => regenerateInviteCode(prisma, userId, groupId))
}

export async function removeMemberAction(groupId: string, memberId: string) {
  if (!idSchema.safeParse(groupId).success || typeof memberId !== "string") {
    return { error: "invalid" as const }
  }
  return run((userId) => removeMember(prisma, userId, groupId, memberId))
}

export async function leaveGroupAction(groupId: string) {
  if (!idSchema.safeParse(groupId).success) return { error: "invalid" as const }
  return run((userId) => leaveGroup(prisma, userId, groupId))
}

export async function setMemberRoleAction(
  groupId: string,
  memberId: string,
  role: string
) {
  const parsed = z.enum(groupRoles).safeParse(role)
  if (
    !idSchema.safeParse(groupId).success ||
    typeof memberId !== "string" ||
    !parsed.success
  ) {
    return { error: "invalid" as const }
  }
  return run((userId) =>
    setMemberRole(prisma, userId, groupId, memberId, parsed.data)
  )
}

export async function deleteGroupAction(groupId: string) {
  if (!idSchema.safeParse(groupId).success) return { error: "invalid" as const }
  return run((userId) => deleteGroup(prisma, userId, groupId))
}
