import type { SyncRecord, SyncTable } from "./records"

/**
 * A version of a record as one side knows it: written, or deleted. Merging
 * two versions of the same thing keeps the "larger" one in a total order, so
 * merging any set of versions gives the same result whatever the order and
 * the grouping of the batches (the property tests check it).
 */
export type RecordVersion<T extends SyncTable = SyncTable> = {
  table: T
  id: string
  /**
   * What makes two records the same thing (see recordKey): two phones may
   * create the same reading progress or highlight under different ids.
   */
  key: string
  /** clientUpdatedAt of the write or the deletion. */
  updatedAt: string
  deleted: boolean
  record: SyncRecord<T> | null
}

/**
 * How each table is merged (PLAN-MOBILE.md, section 4):
 * - lastWriteWins: the latest write or deletion wins;
 * - appendOnly: records are added (and sometimes removed, a reading ticked
 *   off again), rarely edited: the same rule, and a duplicate of the same
 *   thing under another id is dropped;
 * - union: derived records that are never removed, the oldest kept.
 * A reading plan is one aggregate merged as a whole.
 */
export const mergeRules = {
  readingPlan: "lastWriteWins",
  planEnrollment: "lastWriteWins",
  readingProgress: "appendOnly",
  prayerRequest: "lastWriteWins",
  prayerLog: "appendOnly",
  meditationSession: "appendOnly",
  meditationNote: "lastWriteWins",
  highlight: "lastWriteWins",
  reminder: "lastWriteWins",
  achievement: "union",
} as const satisfies Record<SyncTable, "lastWriteWins" | "appendOnly" | "union">

/**
 * What identifies a record beyond its id, within the data of one person: the
 * reading of an enrollment, the verse of a highlight, the level of an
 * achievement, the plan of an enrollment. Other records are their id.
 */
export function recordKey<T extends SyncTable>(
  table: T,
  record: SyncRecord<T>
): string {
  const r = record as SyncRecord
  switch (table) {
    case "readingProgress": {
      const { enrollmentId, readingId } = r as SyncRecord<"readingProgress">
      return `${table}:${enrollmentId}:${readingId}`
    }
    case "highlight": {
      const { book, chapter, verse } = r as SyncRecord<"highlight">
      return `${table}:${book}:${chapter}:${verse}`
    }
    case "achievement": {
      const { key, level } = r as SyncRecord<"achievement">
      return `${table}:${key}:${level}`
    }
    case "planEnrollment":
      return `${table}:${(r as SyncRecord<"planEnrollment">).planId}`
    default:
      return `${table}:${r.id}`
  }
}

/** A version of a record written at `updatedAt`. */
export function writtenVersion<T extends SyncTable>(
  table: T,
  record: SyncRecord<T>,
  updatedAt: string = record.updatedAt
): RecordVersion<T> {
  return {
    table,
    id: record.id,
    key: recordKey(table, record),
    updatedAt,
    deleted: false,
    record,
  }
}

/** A version saying the record was deleted at `updatedAt`. */
export function deletedVersion<T extends SyncTable>(
  table: T,
  record: SyncRecord<T>,
  updatedAt: string
): RecordVersion<T> {
  return {
    table,
    id: record.id,
    key: recordKey(table, record),
    updatedAt,
    deleted: true,
    record: null,
  }
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** The total order of lastWriteWins and appendOnly: 1 when `a` wins. */
function compareWrites(a: RecordVersion, b: RecordVersion): number {
  return (
    // The latest write wins (in milliseconds: "…:00Z" and "…:00.000Z" are
    // the same time but not the same text).
    Math.sign(Date.parse(a.updatedAt) - Date.parse(b.updatedAt)) ||
    // At the same time, a deletion wins: what was removed stays removed.
    Number(a.deleted) - Number(b.deleted) ||
    // Then the smaller id, the content and the time as written: an
    // arbitrary but fixed choice, so that no two versions are ever equal.
    compare(b.id, a.id) ||
    compare(JSON.stringify(a.record), JSON.stringify(b.record)) ||
    compare(a.updatedAt, b.updatedAt)
  )
}

/** The order of union: kept beats deleted, then the oldest unlock. */
function compareUnion(a: RecordVersion, b: RecordVersion): number {
  if (a.deleted !== b.deleted) return a.deleted ? -1 : 1
  const unlocked = (version: RecordVersion) =>
    (version.record as SyncRecord<"achievement"> | null)?.unlockedAt ?? ""
  return (
    compare(unlocked(b), unlocked(a)) ||
    compare(b.id, a.id) ||
    compare(JSON.stringify(a.record), JSON.stringify(b.record)) ||
    // Two deletions of a badge (or two equal ones): the latest, as written.
    compare(a.updatedAt, b.updatedAt)
  )
}

/** Of two versions of the same thing (same table and key), the one to keep. */
export function mergeVersions<T extends SyncTable>(
  a: RecordVersion<T>,
  b: RecordVersion<T>
): RecordVersion<T> {
  const order = mergeRules[a.table] === "union" ? compareUnion : compareWrites
  return order(a, b) >= 0 ? a : b
}

/** Merges versions into the one kept for each thing, keyed by table and key. */
export function mergeAll(
  versions: Iterable<RecordVersion>,
  into: Map<string, RecordVersion> = new Map()
): Map<string, RecordVersion> {
  for (const version of versions) {
    const current = into.get(version.key)
    into.set(version.key, current ? mergeVersions(current, version) : version)
  }
  return into
}

/** A reading of a plan, as far as reattaching progress is concerned. */
type PlanReadingRef =
  SyncRecord<"readingPlan">["days"][number]["readings"][number]

/**
 * After a plan was rebuilt elsewhere (two phones catching up offline, the
 * last one winning), progress may point to readings that no longer exist:
 * it moves to the reading of the same passage and track in the new plan.
 * Gives the readingId each progress should have; progress with no matching
 * reading keeps its own (the reading was read, so it is never regenerated).
 */
export function reattachProgress(
  progress: readonly { id: string; readingId: string }[],
  before: readonly PlanReadingRef[],
  after: readonly PlanReadingRef[]
): Map<string, string> {
  const passageOf = (reading: PlanReadingRef) =>
    [
      reading.track,
      reading.book,
      reading.startChapter,
      reading.startVerse,
      reading.endChapter,
      reading.endVerse,
    ].join(":")
  const kept = new Set(after.map((reading) => reading.id))
  const byPassage = new Map(
    after.map((reading) => [passageOf(reading), reading.id])
  )
  const old = new Map(before.map((reading) => [reading.id, reading]))
  const moved = new Map<string, string>()
  for (const { id, readingId } of progress) {
    if (kept.has(readingId)) continue
    const reading = old.get(readingId)
    const target = reading && byPassage.get(passageOf(reading))
    if (target) moved.set(id, target)
  }
  return moved
}

/**
 * Adoption of a phone's highlights by an account (#57): a verse the account
 * has already colored keeps its color; the others are added.
 */
export function adoptHighlights<
  H extends { book: string; chapter: number; verse: number },
>(account: readonly H[], device: readonly H[]): H[] {
  const verse = (h: H) => `${h.book}:${h.chapter}:${h.verse}`
  const taken = new Set(account.map(verse))
  const added: H[] = []
  for (const highlight of device) {
    if (taken.has(verse(highlight))) continue
    taken.add(verse(highlight))
    added.push(highlight)
  }
  return added
}
