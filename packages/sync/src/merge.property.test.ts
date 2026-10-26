import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  deletedVersion,
  mergeAll,
  writtenVersion,
  type RecordVersion,
} from "./merge"
import type { SyncRecord } from "./records"

// Few ids, verses and times: conflicts and equal times happen all the time.
const uuid = fc.constantFrom(
  "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
  "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b22",
  "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b23"
)
const time = fc.constantFrom(
  "2026-10-27T08:00:00Z",
  "2026-10-27T08:00:00.000Z",
  "2026-10-27T09:30:00Z",
  "2026-10-28T07:00:00Z"
)

const highlight = fc.record({
  id: uuid,
  book: fc.constantFrom("John", "Ps"),
  chapter: fc.constant(3),
  verse: fc.integer({ min: 16, max: 17 }),
  color: fc.constantFrom("YELLOW" as const, "GREEN" as const),
  updatedAt: time,
}) satisfies fc.Arbitrary<SyncRecord<"highlight">>

const progress = fc.record({
  id: uuid,
  enrollmentId: uuid,
  readingId: uuid,
  completedAt: time,
  updatedAt: time,
}) satisfies fc.Arbitrary<SyncRecord<"readingProgress">>

const achievement = fc.record({
  id: uuid,
  key: fc.constantFrom("faithfulness", "prayer"),
  level: fc.integer({ min: 1, max: 2 }),
  unlockedAt: fc.constantFrom("2026-10-12", "2026-10-20"),
  updatedAt: time,
}) satisfies fc.Arbitrary<SyncRecord<"achievement">>

const note = fc.record({
  id: uuid,
  book: fc.constant("John"),
  passage: fc.constant("John.3"),
  keyVerse: fc.constant(null),
  reflection: fc.constantFrom("a", "b", null),
  application: fc.constant(null),
  sessionId: fc.constant(null),
  updatedAt: time,
}) satisfies fc.Arbitrary<SyncRecord<"meditationNote">>

/** A write or a deletion of a record of some table. */
const version: fc.Arbitrary<RecordVersion> = fc.oneof(
  ...(
    [
      ["highlight", highlight],
      ["readingProgress", progress],
      ["achievement", achievement],
      ["meditationNote", note],
    ] as const
  ).map(([table, record]) =>
    fc
      .tuple(record, fc.boolean(), time)
      .map(([data, deleted, at]) =>
        deleted
          ? deletedVersion(table, data as never, at)
          : writtenVersion(table, data as never, at)
      )
  )
)

const sorted = (merged: Map<string, RecordVersion>) =>
  [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : 1))

describe("mergeAll properties", () => {
  it("does not depend on the order the versions arrive in", () => {
    fc.assert(
      fc.property(
        fc.array(version, { maxLength: 40 }),
        fc.infiniteStream(fc.nat()).map((stream) => stream),
        (versions, random) => {
          const shuffled = [...versions]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = random.next().value % (i + 1)
            ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
          }
          expect(sorted(mergeAll(shuffled))).toEqual(sorted(mergeAll(versions)))
        }
      ),
      { numRuns: 300 }
    )
  })

  it("does not depend on how the batches are cut", () => {
    fc.assert(
      fc.property(
        fc.array(version, { maxLength: 40 }),
        fc.integer({ min: 1, max: 10 }),
        (versions, size) => {
          // Batches merged one after the other into what is already there,
          // as the server does push after push.
          let state = new Map<string, RecordVersion>()
          for (let start = 0; start < versions.length; start += size) {
            state = mergeAll(versions.slice(start, start + size), state)
          }
          expect(sorted(state)).toEqual(sorted(mergeAll(versions)))
        }
      ),
      { numRuns: 300 }
    )
  })

  it("changes nothing when a batch is sent again", () => {
    fc.assert(
      fc.property(fc.array(version, { maxLength: 40 }), (versions) => {
        const once = mergeAll(versions)
        const twice = mergeAll(versions, mergeAll(versions))
        expect(sorted(twice)).toEqual(sorted(once))
      }),
      { numRuns: 300 }
    )
  })
})
