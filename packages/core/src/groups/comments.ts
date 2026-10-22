import { z } from "zod"

import { canManageMembers, type GroupRole } from "./schema"

export const maxCommentLength = 2000

/** A comment on the readings of a day, as written in the form. */
export const commentInputSchema = z.object({
  body: z.string().trim().min(1).max(maxCommentLength),
  /** The comment this one answers; none for a new thread. */
  parentId: z.uuid().nullable().default(null),
})
export type CommentInput = z.infer<typeof commentInputSchema>

/** A comment is deleted by its author, or by the people who manage the group. */
export function canDeleteComment(
  authorId: string,
  userId: string,
  role: GroupRole
): boolean {
  return authorId === userId || canManageMembers(role)
}
