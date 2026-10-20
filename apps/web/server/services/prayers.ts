import "server-only"

import {
  maxPrayerRequestsPerUser,
  type PrayerAnswerInput,
  type PrayerCategory,
  type PrayerRequestInput,
  type PrayerStatus,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type PrayersDb = Pick<
  PrismaClient,
  "prayerRequest" | "prayerLog" | "$transaction"
>

export type PrayerError = "limit" | "notFound"

type Outcome = Promise<{ ok: true } | { ok: false; error: PrayerError }>

/** A prayer request, as the journal shows it. */
export type PrayerListItem = {
  id: string
  title: string
  details: string | null
  category: PrayerCategory
  status: PrayerStatus
  lastPrayedAt: Date | null
  prayerCount: number
  answeredAt: Date | null
  answerNote: string | null
  createdAt: Date
}

const select = {
  id: true,
  title: true,
  details: true,
  category: true,
  status: true,
  lastPrayedAt: true,
  prayerCount: true,
  answeredAt: true,
  answerNote: true,
  createdAt: true,
} as const

/**
 * The requests of a user in a status. Active ones come least recently prayed
 * for first, so the list reads as "who is next"; answered ones show the
 * latest answer first.
 */
export async function listPrayers(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  status: PrayerStatus,
  category?: PrayerCategory
): Promise<PrayerListItem[]> {
  return db.prayerRequest.findMany({
    where: { userId, status, ...(category ? { category } : {}) },
    select,
    orderBy:
      status === "ANSWERED"
        ? [{ answeredAt: "desc" }, { id: "desc" }]
        : status === "ARCHIVED"
          ? [{ updatedAt: "desc" }, { id: "desc" }]
          : [
              { lastPrayedAt: { sort: "asc", nulls: "first" } },
              { createdAt: "asc" },
            ],
  })
}

/** How many requests a user has in each status. */
export async function countPrayers(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string
): Promise<Record<PrayerStatus, number>> {
  const groups = await db.prayerRequest.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  })
  const counts: Record<PrayerStatus, number> = {
    ACTIVE: 0,
    ANSWERED: 0,
    ARCHIVED: 0,
  }
  for (const group of groups) counts[group.status] = group._count._all
  return counts
}

export async function createPrayer(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  input: PrayerRequestInput
): Outcome {
  const total = await db.prayerRequest.count({ where: { userId } })
  if (total >= maxPrayerRequestsPerUser) return { ok: false, error: "limit" }
  await db.prayerRequest.create({ data: { userId, ...input } })
  return { ok: true }
}

/**
 * Changes a request of the user. The owner is part of the filter, so the
 * request of someone else is never touched and is reported like one that
 * does not exist.
 */
async function changeOwned(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  id: string,
  data: Parameters<PrismaClient["prayerRequest"]["updateMany"]>[0]["data"],
  where: { status?: PrayerStatus } = {}
): Outcome {
  const { count } = await db.prayerRequest.updateMany({
    where: { id, userId, ...where },
    data,
  })
  return count === 1 ? { ok: true } : { ok: false, error: "notFound" }
}

export function updatePrayer(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  id: string,
  input: PrayerRequestInput
): Outcome {
  return changeOwned(db, userId, id, input)
}

/**
 * "I prayed": counts one more prayer and sets the date of the last one. Only
 * an active request can be prayed for.
 */
export async function markPrayed(
  db: PrayersDb,
  userId: string,
  id: string,
  now: Date = new Date()
): Outcome {
  const request = await db.prayerRequest.findFirst({
    where: { id, userId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!request) return { ok: false, error: "notFound" }
  await db.$transaction([
    db.prayerLog.create({ data: { requestId: id, userId, prayedAt: now } }),
    db.prayerRequest.update({
      where: { id },
      data: { lastPrayedAt: now, prayerCount: { increment: 1 } },
    }),
  ])
  return { ok: true }
}

/** Marks an active request answered, with the note of what happened. */
export function markAnswered(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  id: string,
  { answerNote }: PrayerAnswerInput,
  now: Date = new Date()
): Outcome {
  return changeOwned(
    db,
    userId,
    id,
    { status: "ANSWERED", answeredAt: now, answerNote },
    { status: "ACTIVE" }
  )
}

/** Archives a request, or brings it back among the active ones. */
export function setPrayerStatus(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  id: string,
  status: "ACTIVE" | "ARCHIVED"
): Outcome {
  return changeOwned(db, userId, id, { status })
}

export async function deletePrayer(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  id: string
): Outcome {
  const { count } = await db.prayerRequest.deleteMany({ where: { id, userId } })
  return count === 1 ? { ok: true } : { ok: false, error: "notFound" }
}
