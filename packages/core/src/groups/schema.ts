import { z } from "zod"

export const groupRoles = ["OWNER", "ADMIN", "MEMBER"] as const
export type GroupRole = (typeof groupRoles)[number]

export const maxGroupNameLength = 80
export const maxGroupDescriptionLength = 300
/** Groups a person can belong to, and people a group can hold: simple limits. */
export const maxGroupsPerUser = 20
export const maxMembersPerGroup = 200

/** A group as written in the form. */
export const groupInputSchema = z.object({
  name: z.string().trim().min(1).max(maxGroupNameLength),
  description: z
    .string()
    .trim()
    .max(maxGroupDescriptionLength)
    .transform((text) => (text === "" ? null : text))
    .nullable()
    .default(null),
})
export type GroupInput = z.infer<typeof groupInputSchema>

/** What a person can do in a group depends on their role. */

/** Invites people, removes members, makes a new invitation code. */
export function canManageMembers(role: GroupRole): boolean {
  return role === "OWNER" || role === "ADMIN"
}

/**
 * Whether `actor` can remove `target` from the group: the owner anyone else,
 * an administrator the plain members, and nobody the owner.
 */
export function canRemoveMember(actor: GroupRole, target: GroupRole): boolean {
  if (target === "OWNER") return false
  if (actor === "OWNER") return true
  return actor === "ADMIN" && target === "MEMBER"
}

/** Promotes and demotes members, hands the group over. */
export function canChangeRoles(role: GroupRole): boolean {
  return role === "OWNER"
}

export function canDeleteGroup(role: GroupRole): boolean {
  return role === "OWNER"
}
