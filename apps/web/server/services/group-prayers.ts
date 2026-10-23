import "server-only"

import type {
  IsoDate,
  PrayerCategory,
  PrayerStatus,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

import { roleOf } from "@/server/services/groups"

export type GroupPrayersDb = Pick<
  PrismaClient,
  "prayerRequest" | "prayerSupport" | "groupMember"
>

export type GroupPrayerError = "notFound" | "forbidden"

/** What the group sees of a shared request: never the answer note, never the journal. */
export type GroupPrayer = {
  id: string
  title: string
  details: string | null
  category: PrayerCategory
  status: PrayerStatus
  passages: string[]
  authorId: string
  authorName: string
  answeredOn: IsoDate | null
  /** How many people are praying for it. */
  supportCount: number
  supportedByMe: boolean
}

/** Whether a person may share a request with a group: they are in it. */
export async function canShareWith(
  db: Pick<PrismaClient, "groupMember">,
  userId: string,
  groupId: string
): Promise<boolean> {
  return (await roleOf(db, userId, groupId)) !== null
}

/**
 * The prayer requests shared with a group, for its members (null for
 * anybody else). Only requests that were shared with this group and are active
 * or answered: a private or archived request never shows here, and nothing
 * beyond the title, the details, the category and the passages is given.
 * Active ones first, newest first.
 */
export async function listGroupPrayers(
  db: GroupPrayersDb,
  userId: string,
  groupId: string
): Promise<GroupPrayer[] | null> {
  if (!(await canShareWith(db, userId, groupId))) return null

  const rows = await db.prayerRequest.findMany({
    where: { groupId, status: { in: ["ACTIVE", "ANSWERED"] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      details: true,
      category: true,
      status: true,
      passages: true,
      answeredOn: true,
      userId: true,
      user: { select: { name: true } },
      _count: { select: { supports: true } },
      supports: { where: { userId }, select: { userId: true } },
    },
  })
  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      details: row.details,
      category: row.category,
      status: row.status,
      passages: row.passages,
      authorId: row.userId,
      authorName: row.user.name,
      answeredOn: row.answeredOn
        ? row.answeredOn.toISOString().slice(0, 10)
        : null,
      supportCount: row._count.supports,
      supportedByMe: row.supports.length > 0,
    }))
    .sort(
      (a, b) =>
        Number(a.status === "ANSWERED") - Number(b.status === "ANSWERED")
    )
}

/**
 * "I am praying for you": adds the support of the person to a shared request,
 * or takes it back if it is already there. Only for the members of the group
 * the request is shared with, only while the request is active, and not for
 * one's own request.
 */
export async function togglePraying(
  db: GroupPrayersDb,
  userId: string,
  requestId: string
): Promise<
  | { ok: true; praying: boolean; supportCount: number }
  | { ok: false; error: GroupPrayerError }
> {
  const request = await db.prayerRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, groupId: true, status: true },
  })
  // Not shared, or with a group the person is not in: it is not there for them.
  if (!request?.groupId || !(await canShareWith(db, userId, request.groupId))) {
    return { ok: false, error: "notFound" }
  }
  if (request.userId === userId || request.status !== "ACTIVE") {
    return { ok: false, error: "forbidden" }
  }

  const existing = await db.prayerSupport.findUnique({
    where: { requestId_userId: { requestId, userId } },
    select: { id: true },
  })
  let praying: boolean
  if (existing) {
    await db.prayerSupport.delete({ where: { id: existing.id } })
    praying = false
  } else {
    try {
      await db.prayerSupport.create({ data: { requestId, userId } })
    } catch (error) {
      // Two taps at once: the second finds the first one's support.
      if ((error as { code?: unknown } | null)?.code !== "P2002") throw error
    }
    praying = true
  }
  const supportCount = await db.prayerSupport.count({ where: { requestId } })
  return { ok: true, praying, supportCount }
}
