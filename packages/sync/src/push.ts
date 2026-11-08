import {
  mergeVersions,
  recordKey,
  writtenVersion,
  type RecordVersion,
} from "./merge"
import type { SyncChange } from "./protocol"
import { recordSchemas, type SyncRecord, type SyncTable } from "./records"

/**
 * What the server does with one change of a push, given what it holds for
 * the same record (its id) and for the same thing under another id (its key,
 * see recordKey):
 * - write: store the record, replacing the other one with the same key;
 * - delete: delete the record;
 * - none: nothing to change (a replayed change, a record already deleted),
 *   the change is accepted all the same;
 * - stale: what the server holds wins; `current` is it (null: deleted).
 */
export type PushDecision<T extends SyncTable = SyncTable> =
  | { action: "write"; record: SyncRecord<T>; replaces: string | null }
  | { action: "delete" }
  | { action: "none" }
  | { action: "stale"; current: SyncRecord<T> | null }

/**
 * A record in a fixed order of its fields, to compare two of them; its
 * time is compared apart (the same instant may be written two ways).
 */
function canonical<T extends SyncTable>(table: T, record: SyncRecord<T>) {
  return JSON.stringify({
    ...recordSchemas[table].parse(record),
    updatedAt: "",
  })
}

/** Whether two versions hold the same record written at the same time. */
function same(a: RecordVersion, b: RecordVersion): boolean {
  return (
    !a.deleted &&
    !b.deleted &&
    Date.parse(a.updatedAt) === Date.parse(b.updatedAt) &&
    canonical(a.table, a.record!) === canonical(b.table, b.record!)
  )
}

/**
 * Decides a change of the phone against the server's versions (see
 * mergeVersions): replaying a change gives "none", so a push sent twice
 * changes nothing.
 */
export function decidePush<T extends SyncTable>(
  change: SyncChange & { table: T },
  /** The server's version of the record with this id: kept or deleted. */
  byId: RecordVersion<T> | null,
  /** The server's record for the same thing under another id, if any. */
  byKey: RecordVersion<T> | null
): PushDecision<T> {
  if (change.op === "delete") {
    if (!byId || byId.deleted) return { action: "none" }
    const incoming: RecordVersion<T> = {
      ...byId,
      updatedAt: change.clientUpdatedAt,
      deleted: true,
      record: null,
    }
    return mergeVersions(byId, incoming) === incoming
      ? { action: "delete" }
      : { action: "stale", current: byId.record }
  }

  const record = change.data as SyncRecord<T>
  const incoming = writtenVersion(change.table, record)
  if (byId) {
    if (same(byId, incoming)) return { action: "none" }
    if (mergeVersions(byId, incoming) !== incoming) {
      return { action: "stale", current: byId.record }
    }
  }
  if (byKey && !byKey.deleted && byKey.id !== record.id) {
    if (mergeVersions(byKey, incoming) !== incoming) {
      return { action: "stale", current: byKey.record }
    }
    return { action: "write", record, replaces: byKey.id }
  }
  return { action: "write", record, replaces: null }
}

/** The key of a change's record, to find the same thing on the server. */
export function changeKey(change: SyncChange): string | null {
  return change.op === "upsert" && change.data
    ? recordKey(change.table, change.data as SyncRecord)
    : null
}
