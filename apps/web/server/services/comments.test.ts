import { describe, expect, it, vi } from "vitest"

import {
  addComment,
  deleteComment,
  getDayThread,
  type CommentsDb,
} from "./comments"

type Role = "OWNER" | "ADMIN" | "MEMBER"

/** A fake database: one group plan day, and who is in the group. */
function fake({
  members,
  groupId = "g1",
}: {
  members: Record<string, Role>
  groupId?: string | null
}) {
  const planDay = {
    findUnique: vi.fn().mockResolvedValue({
      id: "day-1",
      date: new Date("2026-11-03T00:00:00Z"),
      plan: { groupId },
    }),
  }
  const groupMember = {
    findUnique: vi.fn(
      async ({ where }: { where: { groupId_userId: { userId: string } } }) => {
        const role = members[where.groupId_userId.userId]
        return role ? { role } : null
      }
    ),
  }
  const readingComment = {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "c-new" }),
    delete: vi.fn().mockResolvedValue({}),
  }
  return {
    db: { planDay, groupMember, readingComment } as unknown as CommentsDb,
    planDay,
    groupMember,
    readingComment,
  }
}

const row = (
  id: string,
  userId: string,
  parentId: string | null,
  second: number
) => ({
  id,
  userId,
  parentId,
  body: `text ${id}`,
  createdAt: new Date(Date.UTC(2026, 10, 3, 8, 0, second)),
  user: { name: `name ${userId}` },
})

describe("getDayThread", () => {
  it("is for the members of the group only", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    expect(await getDayThread(db, "stranger", "p1", 1)).toBeNull()
    expect(readingComment.findMany).not.toHaveBeenCalled()
  })

  it("is not there for a plan that is not a group's", async () => {
    const { db } = fake({ members: { a: "MEMBER" }, groupId: null })
    expect(await getDayThread(db, "a", "p1", 1)).toBeNull()
  })

  it("puts the answers under their comment, oldest first", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findMany.mockResolvedValue([
      row("c1", "a", null, 1),
      row("c2", "b", null, 2),
      row("r1", "b", "c1", 3),
      row("r2", "a", "c1", 4),
    ])
    const thread = await getDayThread(db, "a", "p1", 1)
    expect(thread?.role).toBe("MEMBER")
    expect(thread?.date).toBe("2026-11-03")
    expect(thread?.comments.map((comment) => comment.id)).toEqual(["c1", "c2"])
    expect(thread?.comments[0]!.replies.map((reply) => reply.id)).toEqual([
      "r1",
      "r2",
    ])
    expect(thread?.comments[1]!.replies).toEqual([])
  })
})

describe("addComment", () => {
  it("lets a member write a new comment on the day", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    expect(
      await addComment(db, "a", "p1", 1, { body: "Merci", parentId: null })
    ).toEqual({ ok: true, id: "c-new" })
    expect(readingComment.create).toHaveBeenCalledWith({
      data: { dayId: "day-1", userId: "a", parentId: null, body: "Merci" },
      select: { id: true },
    })
  })

  it("refuses somebody who is not in the group", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    expect(
      await addComment(db, "stranger", "p1", 1, { body: "Hello", parentId: null })
    ).toEqual({ ok: false, error: "notFound" })
    expect(readingComment.create).not.toHaveBeenCalled()
  })

  it("answers a comment of the same day", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findUnique.mockResolvedValue({ dayId: "day-1", parentId: null })
    await addComment(db, "a", "p1", 1, { body: "Oui", parentId: "c1" })
    expect(readingComment.create.mock.calls[0]![0].data.parentId).toBe("c1")
  })

  it("puts an answer to an answer under the first comment", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findUnique.mockResolvedValue({ dayId: "day-1", parentId: "c1" })
    await addComment(db, "a", "p1", 1, { body: "Aussi", parentId: "r1" })
    expect(readingComment.create.mock.calls[0]![0].data.parentId).toBe("c1")
  })

  it("does not answer a comment of another day", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findUnique.mockResolvedValue({
      dayId: "other-day",
      parentId: null,
    })
    expect(
      await addComment(db, "a", "p1", 1, { body: "Non", parentId: "c9" })
    ).toEqual({ ok: false, error: "notFound" })
    expect(readingComment.create).not.toHaveBeenCalled()
  })
})

describe("deleteComment", () => {
  const comment = (author: string, groupId: string | null = "g1") => ({
    userId: author,
    day: { plan: { groupId } },
  })

  it("lets the author delete their comment", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findUnique.mockResolvedValue(comment("a"))
    expect(await deleteComment(db, "a", "c1")).toEqual({ ok: true })
    expect(readingComment.delete).toHaveBeenCalledWith({ where: { id: "c1" } })
  })

  it("lets an administrator delete the comment of a member", async () => {
    const { db, readingComment } = fake({
      members: { a: "MEMBER", admin: "ADMIN" },
    })
    readingComment.findUnique.mockResolvedValue(comment("a"))
    expect(await deleteComment(db, "admin", "c1")).toEqual({ ok: true })
  })

  it("does not let a plain member delete the comment of someone else", async () => {
    const { db, readingComment } = fake({
      members: { a: "MEMBER", b: "MEMBER" },
    })
    readingComment.findUnique.mockResolvedValue(comment("a"))
    expect(await deleteComment(db, "b", "c1")).toEqual({
      ok: false,
      error: "forbidden",
    })
    expect(readingComment.delete).not.toHaveBeenCalled()
  })

  it("does not reveal a comment to somebody outside the group", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findUnique.mockResolvedValue(comment("a"))
    expect(await deleteComment(db, "stranger", "c1")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(readingComment.delete).not.toHaveBeenCalled()
  })

  it("is not there when the comment does not exist", async () => {
    const { db, readingComment } = fake({ members: { a: "MEMBER" } })
    readingComment.findUnique.mockResolvedValue(null)
    expect(await deleteComment(db, "a", "nope")).toEqual({
      ok: false,
      error: "notFound",
    })
  })
})
