import "server-only"

import {
  canDeleteComment,
  type CommentInput,
  type GroupRole,
  type IsoDate,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

import { roleOf } from "@/server/services/groups"
import { fromDbDate } from "@/server/services/plans"

export type CommentsDb = Pick<
  PrismaClient,
  "readingComment" | "planDay" | "groupMember"
>

/**
 * Why something was refused. A day of a plan that is not a group's, a group
 * the person is not in, and a day that does not exist are all "notFound".
 */
export type CommentError = "notFound" | "forbidden"

export type CommentView = {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: Date
  replies: CommentView[]
}

export type DayThread = {
  groupId: string
  date: IsoDate
  /** The role of the person in the group, for what they may delete. */
  role: GroupRole
  comments: CommentView[]
}

/** The group and the role of a person for a day of a plan, or null. */
async function dayAccess(
  db: Pick<PrismaClient, "planDay" | "groupMember">,
  userId: string,
  planId: string,
  dayNumber: number
): Promise<{
  dayId: string
  groupId: string
  date: Date
  role: GroupRole
} | null> {
  const day = await db.planDay.findUnique({
    where: { planId_dayNumber: { planId, dayNumber } },
    select: { id: true, date: true, plan: { select: { groupId: true } } },
  })
  const groupId = day?.plan.groupId
  if (!day || !groupId) return null
  const role = await roleOf(db, userId, groupId)
  return role ? { dayId: day.id, groupId, date: day.date, role } : null
}

/**
 * The discussion about a day of a group plan, oldest first, with the answers
 * under each comment; only for the members of the group (null otherwise).
 */
export async function getDayThread(
  db: CommentsDb,
  userId: string,
  planId: string,
  dayNumber: number
): Promise<DayThread | null> {
  const access = await dayAccess(db, userId, planId, dayNumber)
  if (!access) return null

  const rows = await db.readingComment.findMany({
    where: { dayId: access.dayId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      userId: true,
      parentId: true,
      body: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  })

  const views = new Map<string, CommentView>()
  for (const row of rows) {
    views.set(row.id, {
      id: row.id,
      authorId: row.userId,
      authorName: row.user.name,
      body: row.body,
      createdAt: row.createdAt,
      replies: [],
    })
  }
  const comments: CommentView[] = []
  for (const row of rows) {
    const view = views.get(row.id)!
    const parent = row.parentId ? views.get(row.parentId) : undefined
    // A reply goes under its comment; one whose comment is gone is dropped.
    if (parent) parent.replies.push(view)
    else if (!row.parentId) comments.push(view)
  }
  return {
    groupId: access.groupId,
    date: fromDbDate(access.date),
    role: access.role,
    comments,
  }
}

/**
 * Writes a comment (or an answer) on a day of a group plan. Members only.
 * An answer to an answer goes under the first comment: threads are one level.
 */
export async function addComment(
  db: CommentsDb,
  userId: string,
  planId: string,
  dayNumber: number,
  { body, parentId }: CommentInput
): Promise<{ ok: true; id: string } | { ok: false; error: CommentError }> {
  const access = await dayAccess(db, userId, planId, dayNumber)
  if (!access) return { ok: false, error: "notFound" }

  let parent: string | null = null
  if (parentId) {
    const target = await db.readingComment.findUnique({
      where: { id: parentId },
      select: { dayId: true, parentId: true },
    })
    // The comment answered has to be on the same day.
    if (!target || target.dayId !== access.dayId) {
      return { ok: false, error: "notFound" }
    }
    parent = target.parentId ?? parentId
  }
  const { id } = await db.readingComment.create({
    data: { dayId: access.dayId, userId, parentId: parent, body },
    select: { id: true },
  })
  return { ok: true, id }
}

/** Deletes a comment, with its answers: its author, or whoever manages the group. */
export async function deleteComment(
  db: Pick<PrismaClient, "readingComment" | "groupMember">,
  userId: string,
  commentId: string
): Promise<{ ok: true } | { ok: false; error: CommentError }> {
  const comment = await db.readingComment.findUnique({
    where: { id: commentId },
    select: {
      userId: true,
      day: { select: { plan: { select: { groupId: true } } } },
    },
  })
  const groupId = comment?.day.plan.groupId
  if (!comment || !groupId) return { ok: false, error: "notFound" }
  const role = await roleOf(db, userId, groupId)
  if (!role) return { ok: false, error: "notFound" }
  if (!canDeleteComment(comment.userId, userId, role)) {
    return { ok: false, error: "forbidden" }
  }
  await db.readingComment.delete({ where: { id: commentId } })
  return { ok: true }
}
