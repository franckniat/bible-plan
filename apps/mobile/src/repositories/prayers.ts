import {
  getToday,
  maxPrayerRequestsPerUser,
  prayerAnswerInputSchema,
  prayerRequestInputSchema,
  type IsoDate,
  type PrayerAnswerInput,
  type PrayerRequestInput,
  type PrayerStatus,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import { asc, count, desc, eq, sql } from "drizzle-orm"
import type { z } from "zod"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { prayerLogs, prayerRequests } from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced, type LocalChange } from "./write"

export type Prayer = typeof prayerRequests.$inferSelect
export type PrayerError = "limit" | "notFound"
type Outcome = { ok: true; id: string } | { ok: false; error: PrayerError }
type Options = { now?: Date; id?: () => string; today?: IsoDate }

const prayerTables = ["prayerRequest", "prayerLog"]

function getPrayer(db: Database, id: string): Prayer | undefined {
  return db.select().from(prayerRequests).where(eq(prayerRequests.id, id)).get()
}

/** Writes the request as it now is, with its outbox entry. */
function savePrayer(
  db: Database,
  record: SyncRecord<"prayerRequest">,
  now: Date,
  more: LocalChange[] = [],
  apply?: (tx: Database) => void
) {
  writeSynced(
    db,
    [{ table: "prayerRequest", op: "upsert", record }, ...more],
    (tx) => {
      tx.insert(prayerRequests)
        .values(record)
        .onConflictDoUpdate({ target: prayerRequests.id, set: record })
        .run()
      apply?.(tx)
    },
    now
  )
}

/**
 * The requests in a status, as on the web: active ones least recently prayed
 * for first ("who is next"), answered ones latest answer first.
 */
export function listPrayers(db: Database, status: PrayerStatus): Prayer[] {
  return db
    .select()
    .from(prayerRequests)
    .where(eq(prayerRequests.status, status))
    .orderBy(
      ...(status === "ANSWERED"
        ? [desc(prayerRequests.answeredOn), desc(prayerRequests.id)]
        : status === "ARCHIVED"
          ? [desc(prayerRequests.updatedAt), desc(prayerRequests.id)]
          : [
              sql`${prayerRequests.lastPrayedAt} IS NOT NULL`,
              asc(prayerRequests.lastPrayedAt),
              asc(prayerRequests.id),
            ])
    )
    .all()
}

/** How many requests are in each status. */
export function countPrayers(db: Database): Record<PrayerStatus, number> {
  const counts: Record<PrayerStatus, number> = {
    ACTIVE: 0,
    ANSWERED: 0,
    ARCHIVED: 0,
  }
  for (const row of db
    .select({ status: prayerRequests.status, count: count() })
    .from(prayerRequests)
    .groupBy(prayerRequests.status)
    .all()) {
    counts[row.status] = row.count
  }
  return counts
}

/** Adds a request to the journal, or changes one (`id`). */
export function savePrayerRequest(
  db: Database,
  input: z.input<typeof prayerRequestInputSchema>,
  existingId: string | null,
  { now = new Date(), id = newId, today = getToday() }: Options = {}
): Outcome {
  const { startedOn, groupId, ...fields }: PrayerRequestInput =
    prayerRequestInputSchema.parse(input)
  const current = existingId ? getPrayer(db, existingId) : undefined
  if (existingId && !current) return { ok: false, error: "notFound" }
  if (!current) {
    const total = db.select({ count: count() }).from(prayerRequests).get()
    if ((total?.count ?? 0) >= maxPrayerRequestsPerUser) {
      return { ok: false, error: "limit" }
    }
  }
  const record: SyncRecord<"prayerRequest"> = {
    status: "ACTIVE",
    lastPrayedAt: null,
    prayerCount: 0,
    answeredOn: null,
    answerNote: null,
    ...current,
    ...fields,
    id: current?.id ?? id(),
    startedOn: startedOn ?? current?.startedOn ?? today,
    groupId: groupId === undefined ? (current?.groupId ?? null) : groupId,
    updatedAt: now.toISOString(),
  }
  savePrayer(db, record, now)
  return { ok: true, id: record.id }
}

/**
 * "I prayed": one more prayer, logged for the statistics. Only an active
 * request can be prayed for.
 */
export function markPrayed(
  db: Database,
  requestId: string,
  { now = new Date(), id = newId }: Options = {}
): Outcome {
  const current = getPrayer(db, requestId)
  if (current?.status !== "ACTIVE") return { ok: false, error: "notFound" }
  const at = now.toISOString()
  const log: SyncRecord<"prayerLog"> = {
    id: id(),
    requestId,
    prayedAt: at,
    updatedAt: at,
  }
  savePrayer(
    db,
    {
      ...current,
      lastPrayedAt: at,
      prayerCount: current.prayerCount + 1,
      updatedAt: at,
    },
    now,
    [{ table: "prayerLog", op: "upsert", record: log }],
    (tx) => tx.insert(prayerLogs).values(log).run()
  )
  return { ok: true, id: requestId }
}

/** Marks an active request answered, with what happened. */
export function markAnswered(
  db: Database,
  requestId: string,
  input: z.input<typeof prayerAnswerInputSchema>,
  { now = new Date(), today = getToday() }: Options = {}
): Outcome {
  const { answeredOn, answerNote }: PrayerAnswerInput =
    prayerAnswerInputSchema.parse(input)
  const current = getPrayer(db, requestId)
  if (!current || current.status === "ARCHIVED") {
    return { ok: false, error: "notFound" }
  }
  savePrayer(
    db,
    {
      ...current,
      status: "ANSWERED",
      answeredOn: answeredOn ?? current.answeredOn ?? today,
      answerNote,
      updatedAt: now.toISOString(),
    },
    now
  )
  return { ok: true, id: requestId }
}

/** Archives a request, or puts it back among the active ones. */
export function setPrayerStatus(
  db: Database,
  requestId: string,
  status: "ACTIVE" | "ARCHIVED",
  { now = new Date() }: Options = {}
): Outcome {
  const current = getPrayer(db, requestId)
  if (!current) return { ok: false, error: "notFound" }
  savePrayer(
    db,
    {
      ...current,
      status,
      // Back among the active ones, it is no longer answered.
      ...(status === "ACTIVE" ? { answeredOn: null, answerNote: null } : {}),
      updatedAt: now.toISOString(),
    },
    now
  )
  return { ok: true, id: requestId }
}

/** Deletes a request and its history. */
export function deletePrayer(
  db: Database,
  requestId: string,
  { now = new Date() }: Options = {}
): Outcome {
  if (!getPrayer(db, requestId)) return { ok: false, error: "notFound" }
  const logs = db
    .select({ id: prayerLogs.id })
    .from(prayerLogs)
    .where(eq(prayerLogs.requestId, requestId))
    .all()
  writeSynced(
    db,
    [
      ...logs.map((log): LocalChange => ({
        table: "prayerLog",
        op: "delete",
        id: log.id,
      })),
      { table: "prayerRequest", op: "delete", id: requestId },
    ],
    (tx) => {
      tx.delete(prayerLogs).where(eq(prayerLogs.requestId, requestId)).run()
      tx.delete(prayerRequests).where(eq(prayerRequests.id, requestId)).run()
    },
    now
  )
  return { ok: true, id: requestId }
}

/** The requests in a status, kept up to date. */
export function usePrayers(status: PrayerStatus): Prayer[] {
  return useLocalQuery(prayerTables, () => listPrayers(getDatabase(), status), [
    status,
  ])
}

export function usePrayerCounts(): Record<PrayerStatus, number> {
  return useLocalQuery(prayerTables, () => countPrayers(getDatabase()))
}

export function usePrayer(id: string | undefined): Prayer | null {
  return useLocalQuery(
    prayerTables,
    () => (id ? (getPrayer(getDatabase(), id) ?? null) : null),
    [id]
  )
}

/** The journal's actions, for screens. */
export const prayerJournal = {
  save: (
    input: z.input<typeof prayerRequestInputSchema>,
    id: string | null,
    today: IsoDate
  ) => savePrayerRequest(getDatabase(), input, id, { today }),
  prayed: (id: string) => markPrayed(getDatabase(), id),
  answered: (
    id: string,
    input: z.input<typeof prayerAnswerInputSchema>,
    today: IsoDate
  ) => markAnswered(getDatabase(), id, input, { today }),
  setStatus: (id: string, status: "ACTIVE" | "ARCHIVED") =>
    setPrayerStatus(getDatabase(), id, status),
  remove: (id: string) => deletePrayer(getDatabase(), id),
}

/** Titles of the active requests, least recently prayed for first (reminders). */
export function activePrayerTitles(): string[] {
  return listPrayers(getDatabase(), "ACTIVE").map((prayer) => prayer.title)
}
