import "server-only"

import {
  maxPrayerRequestsPerUser,
  type IsoDate,
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
  /** Calendar dates, read at midnight UTC. */
  startedOn: Date
  passages: string[]
  lastPrayedAt: Date | null
  prayerCount: number
  answeredOn: Date | null
  answerNote: string | null
  createdAt: Date
  /** The group it is shared with, if any. */
  group: { id: string; name: string } | null
}

/** A calendar date as stored in a date column. */
function dateOnly(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`)
}

const select = {
  id: true,
  title: true,
  details: true,
  category: true,
  status: true,
  startedOn: true,
  passages: true,
  lastPrayedAt: true,
  prayerCount: true,
  answeredOn: true,
  answerNote: true,
  createdAt: true,
  group: { select: { id: true, name: true } },
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
        ? [{ answeredOn: "desc" }, { id: "desc" }]
        : status === "ARCHIVED"
          ? [{ updatedAt: "desc" }, { id: "desc" }]
          : [
              { lastPrayedAt: { sort: "asc", nulls: "first" } },
              { createdAt: "asc" },
            ],
  })
}

/**
 * The titles of the active requests, those prayed for least recently first
 * (never prayed for ones before all), for the prayer reminders.
 */
export async function listPrayerTitles(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string
): Promise<string[]> {
  const rows = await db.prayerRequest.findMany({
    where: { userId, status: "ACTIVE" },
    select: { title: true },
    orderBy: [
      { lastPrayedAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  })
  return rows.map((row) => row.title)
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
  { startedOn, ...input }: PrayerRequestInput,
  today: IsoDate,
  /** An id made by the phone (clientIdSchema); the database makes one otherwise. */
  { id }: { id?: string } = {}
): Outcome {
  const total = await db.prayerRequest.count({ where: { userId } })
  if (total >= maxPrayerRequestsPerUser) return { ok: false, error: "limit" }
  await db.prayerRequest.create({
    data: {
      ...(id ? { id } : {}),
      userId,
      ...input,
      startedOn: dateOnly(startedOn ?? today),
    },
  })
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
  { startedOn, ...input }: PrayerRequestInput
): Outcome {
  return changeOwned(db, userId, id, {
    ...input,
    // Left out, the start date stays as it was.
    ...(startedOn ? { startedOn: dateOnly(startedOn) } : {}),
  })
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
  { answeredOn, answerNote }: PrayerAnswerInput,
  today: IsoDate
): Outcome {
  return changeOwned(
    db,
    userId,
    id,
    {
      status: "ANSWERED",
      answeredOn: dateOnly(answeredOn ?? today),
      answerNote,
    },
    { status: "ACTIVE" }
  )
}

/** Corrects the day and the circumstances of an answered request. */
export function updateAnswer(
  db: Pick<PrismaClient, "prayerRequest">,
  userId: string,
  id: string,
  { answeredOn, answerNote }: PrayerAnswerInput
): Outcome {
  return changeOwned(
    db,
    userId,
    id,
    {
      ...(answeredOn ? { answeredOn: dateOnly(answeredOn) } : {}),
      answerNote,
    },
    { status: "ANSWERED" }
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
