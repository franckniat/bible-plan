"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { commentInputSchema } from "@workspace/core"
import { prisma } from "@workspace/db"

import {
  addComment,
  deleteComment,
  type CommentError,
} from "@/server/services/comments"
import { requireUser } from "@/server/session"

/** Translated by the discussion ("Comments.errors.<code>"). */
export type CommentActionError = CommentError | "invalid" | "unexpected"

const idSchema = z.uuid()

/** Writes a comment, or an answer, on a day of a group plan. */
export async function addCommentAction(
  planId: string,
  dayNumber: number,
  request: unknown
): Promise<{ ok: true } | { error: CommentActionError }> {
  const user = await requireUser()
  const parsed = commentInputSchema.safeParse(request)
  if (
    !parsed.success ||
    !idSchema.safeParse(planId).success ||
    !Number.isInteger(dayNumber) ||
    dayNumber < 1
  ) {
    return { error: "invalid" }
  }
  try {
    const result = await addComment(
      prisma,
      user.id,
      planId,
      dayNumber,
      parsed.data
    )
    if (!result.ok) return { error: result.error }
  } catch (error) {
    console.error("Adding a comment failed", error)
    return { error: "unexpected" }
  }
  revalidatePath("/[locale]/plans/[id]/days/[day]", "page")
  return { ok: true }
}

/** Deletes a comment: its author, or whoever manages the group. */
export async function deleteCommentAction(
  commentId: string
): Promise<{ ok: true } | { error: CommentActionError }> {
  const user = await requireUser()
  if (!idSchema.safeParse(commentId).success) return { error: "invalid" }
  try {
    const result = await deleteComment(prisma, user.id, commentId)
    if (!result.ok) return { error: result.error }
  } catch (error) {
    console.error("Deleting a comment failed", error)
    return { error: "unexpected" }
  }
  revalidatePath("/[locale]/plans/[id]/days/[day]", "page")
  return { ok: true }
}
