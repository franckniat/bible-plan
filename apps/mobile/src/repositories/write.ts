import {
  syncChangeSchema,
  type SyncChange,
  type SyncRecord,
  type SyncTable,
} from "@workspace/sync"

import { notifyChange } from "@/db/changes"
import { outbox } from "@/db/schema"
import type { Database } from "@/db/types"

/** A write of a synced record, as the outbox keeps it for the push. */
export type LocalChange<T extends SyncTable = SyncTable> =
  | { table: T; op: "upsert"; record: SyncRecord<T> }
  | { table: T; op: "delete"; id: string }

/**
 * Writes a synced record: `apply` changes the local table and the change goes
 * into the outbox, in one transaction (both or neither). Done with or without
 * an account: creating one pushes the outbox (the adoption). Then the screens
 * reading the table refresh.
 */
export function writeSynced<T extends SyncTable>(
  db: Database,
  change: LocalChange<T>,
  apply: (tx: Database) => void,
  now: Date = new Date()
): void {
  const clientUpdatedAt = now.toISOString()
  const entry: SyncChange =
    change.op === "upsert"
      ? syncChangeSchema.parse({
          table: change.table,
          id: change.record.id,
          op: "upsert",
          data: change.record,
          clientUpdatedAt,
        })
      : syncChangeSchema.parse({
          table: change.table,
          id: change.id,
          op: "delete",
          clientUpdatedAt,
        })

  db.transaction((tx) => {
    apply(tx as Database)
    tx.insert(outbox)
      .values({
        table: entry.table,
        recordId: entry.id,
        op: entry.op,
        data: entry.data === undefined ? null : JSON.stringify(entry.data),
        clientUpdatedAt,
      })
      .run()
  })
  notifyChange(change.table)
}

/** The outbox, oldest first: what the next push will send. */
export function readOutbox(db: Database): SyncChange[] {
  return db
    .select()
    .from(outbox)
    .orderBy(outbox.seq)
    .all()
    .map((row) =>
      syncChangeSchema.parse({
        table: row.table,
        id: row.recordId,
        op: row.op,
        ...(row.data === null ? {} : { data: JSON.parse(row.data) }),
        clientUpdatedAt: row.clientUpdatedAt,
      })
    )
}
