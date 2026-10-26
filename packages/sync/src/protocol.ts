import { z } from "zod"

import { recordSchemas, syncTables, type SyncTable } from "./records"

/**
 * The format of POST /api/v1/sync/push and GET /api/v1/sync/pull.
 *
 * The phone pushes the changes of its outbox, then pulls what changed on the
 * server since its cursor. The cursor is a server sequence (syncVersion), not
 * a clock: phones with a wrong time cannot miss a change. clientUpdatedAt
 * only decides between two writes of the same record (see merge.ts).
 */

/** Changes sent in one push, at most. */
export const maxPushChanges = 500
/** Changes and deletions given in one page of a pull, at most. */
export const maxPullChanges = 500

const dateTime = z.iso.datetime()

/** A cursor: a syncVersion, as text (it is a 64-bit integer). */
export const syncCursorSchema = z.string().regex(/^\d{1,19}$/)

function changeSchema<T extends SyncTable>(table: T) {
  return z
    .object({
      table: z.literal(table),
      id: z.uuid(),
      op: z.enum(["upsert", "delete"]),
      /** The record for an upsert; none for a delete. */
      data: recordSchemas[table].optional(),
      clientUpdatedAt: dateTime,
    })
    .refine(
      (change) =>
        change.op === "delete"
          ? change.data === undefined
          : change.data?.id === change.id,
      { error: "data" }
    )
}

const changeSchemas = syncTables.map((table) => changeSchema(table))

/** A change of the phone's outbox. */
export const syncChangeSchema = z.union(
  changeSchemas as unknown as [
    (typeof changeSchemas)[number],
    ...(typeof changeSchemas)[number][],
  ]
)
export type SyncChange = z.infer<typeof syncChangeSchema>

export const pushRequestSchema = z.object({
  changes: z.array(syncChangeSchema).max(maxPushChanges),
})
export type PushRequest = z.infer<typeof pushRequestSchema>

/** Why the server did not take a change. */
export const rejectionReasons = [
  /** The record belongs to someone else. */
  "forbidden",
  /** A rule of the app refuses it (a limit, a missing parent…). */
  "invalid",
  /** A newer write of the same record is already there. */
  "stale",
] as const
export type RejectionReason = (typeof rejectionReasons)[number]

const tableRecord = z.union(
  syncTables.map((table) =>
    z.object({ table: z.literal(table), record: recordSchemas[table] })
  ) as unknown as [z.ZodTypeAny, ...z.ZodTypeAny[]]
)

export const pushResponseSchema = z.object({
  /** Ids written as sent. */
  accepted: z.array(z.uuid()),
  rejected: z.array(
    z.object({ id: z.uuid(), reason: z.enum(rejectionReasons) })
  ),
  /** Records whose stored version differs from what was sent (merged). */
  merged: z.array(tableRecord),
})
export type PushResponse = z.infer<typeof pushResponseSchema>

export const pullRequestSchema = z.object({
  /** "0" for a first pull. */
  cursor: syncCursorSchema.default("0"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(maxPullChanges)
    .default(maxPullChanges),
})

export const pullResponseSchema = z.object({
  changes: z.array(tableRecord),
  deletions: z.array(
    z.object({
      table: z.enum(syncTables as [SyncTable, ...SyncTable[]]),
      id: z.uuid(),
    })
  ),
  /** Where the next pull starts. */
  cursor: syncCursorSchema,
  /** Another page is waiting: pull again at once. */
  more: z.boolean(),
  /**
   * The cursor is older than the deletions kept: the phone must drop what it
   * got from the server and pull again from "0".
   */
  reset: z.boolean(),
})
export type PullResponse = z.infer<typeof pullResponseSchema>
