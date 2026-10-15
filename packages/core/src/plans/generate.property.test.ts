import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { bookIds } from "../bible/books"
import type { Passage } from "../bible/passage"
import { getChapterCount, getVerseCount } from "../bible/verse-counts"
import { countVerses, versesForMinutes } from "../bible/weight"
import type { IsoDate } from "../schemas/common"
import { addDays, computeActiveDates, getWeekday } from "./dates"
import { generatePlan } from "./generate"
import {
  PlanGenerationError,
  type GeneratedPlan,
  type ParsedPlanInput,
  type PlanInput,
} from "./schema"

/** A passage of 1 to 5 chapters, sometimes starting or ending mid-chapter. */
const passageArbitrary: fc.Arbitrary<Passage> = fc
  .record({
    book: fc.constantFrom(...bookIds),
    from: fc.nat(),
    length: fc.integer({ min: 0, max: 4 }),
    startVerse: fc.option(fc.nat(), { freq: 3 }),
    endVerse: fc.option(fc.nat(), { freq: 3 }),
  })
  .map(({ book, from, length, startVerse, endVerse }) => {
    const chapters = getChapterCount(book)
    const startChapter = 1 + (from % chapters)
    const endChapter = Math.min(chapters, startChapter + length)
    const lastVerse = getVerseCount(book, endChapter)
    let start =
      startVerse === null
        ? 1
        : 1 + (startVerse % getVerseCount(book, startChapter))
    let end = endVerse === null ? lastVerse : 1 + (endVerse % lastVerse)
    if (startChapter === endChapter && end < start) [start, end] = [end, start]
    return {
      book,
      start: { chapter: startChapter, verse: start },
      end: { chapter: endChapter, verse: end },
    }
  })

const trackArbitrary = fc.record({
  passages: fc.array(passageArbitrary, { minLength: 1, maxLength: 4 }),
})

const dateArbitrary = fc
  .integer({ min: 0, max: 5 * 365 })
  .map((offset) => addDays("2026-01-01", offset))

/**
 * A pace whose number of days rarely goes beyond `maxDays` (the verses of
 * the shortest track), so most inputs produce a plan; the rest checks the
 * errors.
 */
const paceArbitrary = (maxDays: number) =>
  fc.oneof(
    fc.record({
      mode: fc.constant("days" as const),
      days: fc.integer({ min: 1, max: Math.min(400, maxDays + 2) }),
    }),
    fc.record({
      mode: fc.constant("endDate" as const),
      span: fc.integer({ min: 0, max: Math.min(400, maxDays + 2) }),
    }),
    fc.record({
      mode: fc.constant("minutesPerDay" as const),
      // At least 2 minutes: 4 verses, enough for one verse per track.
      minutes: fc.integer({ min: 2, max: 60 }),
      readingWpm: fc.integer({ min: 60, max: 400 }),
    })
  )

const inputArbitrary: fc.Arbitrary<PlanInput> = fc
  .record({
    tracks: fc.array(trackArbitrary, { minLength: 1, maxLength: 3 }),
    startDate: dateArbitrary,
    activeWeekdays: fc.uniqueArray(fc.integer({ min: 0, max: 6 }), {
      minLength: 1,
      maxLength: 7,
    }),
  })
  .chain((input) =>
    paceArbitrary(
      Math.min(...input.tracks.map((track) => countVerses(track.passages)))
    ).map((pace) => ({
      ...input,
      pace:
        pace.mode === "endDate"
          ? { mode: pace.mode, endDate: addDays(input.startDate, pace.span) }
          : pace,
    }))
  )

/** Every verse of passages, in reading order: "Gen 1:1", "Gen 1:2"... */
function verseKeys(passages: readonly Passage[]): string[] {
  const keys: string[] = []
  for (const { book, start, end } of passages) {
    for (let chapter = start.chapter; chapter <= end.chapter; chapter++) {
      const first = chapter === start.chapter ? start.verse : 1
      const last =
        chapter === end.chapter ? end.verse : getVerseCount(book, chapter)
      for (let verse = first; verse <= last; verse++) {
        keys.push(`${book} ${chapter}:${verse}`)
      }
    }
  }
  return keys
}

/** Days of a minutes-per-day plan: total verses / verses read in the time. */
function minutesPlanDays(
  tracks: PlanInput["tracks"],
  minutes: number,
  readingWpm: number
): number {
  const total = tracks.reduce(
    (sum, track) => sum + countVerses(track.passages),
    0
  )
  return Math.ceil(total / versesForMinutes(minutes, readingWpm))
}

/** Generates the plan, or null when the input legitimately cannot work. */
function tryGenerate(input: PlanInput): GeneratedPlan | null {
  try {
    return generatePlan(input)
  } catch (error) {
    if (!(error instanceof PlanGenerationError)) throw error
    const { tracks, pace, startDate, activeWeekdays } = input as ParsedPlanInput
    const smallest = Math.min(
      ...tracks.map((track) => countVerses(track.passages))
    )
    if (error.code === "too_many_days") {
      // Only when a track has fewer verses than there are days.
      const days =
        pace.mode === "days"
          ? pace.days
          : pace.mode === "endDate"
            ? computeActiveDates({
                startDate,
                activeWeekdays,
                endDate: pace.endDate,
              }).length
            : minutesPlanDays(tracks, pace.minutes, pace.readingWpm)
      expect(smallest).toBeLessThan(days)
    } else {
      expect(error.code).toBe("no_active_days")
      expect(pace.mode).toBe("endDate")
    }
    return null
  }
}

const runs = { numRuns: 300 }

describe("generatePlan properties", () => {
  it("reads every verse of every track once, in order", () => {
    fc.assert(
      fc.property(inputArbitrary, (input) => {
        const plan = tryGenerate(input)
        if (!plan) return
        input.tracks.forEach((track, index) => {
          const read = plan.days.flatMap((day) =>
            day.readings
              .filter((reading) => reading.track === index)
              .map((reading) => reading.passage)
          )
          expect(verseKeys(read)).toEqual(verseKeys(track.passages))
        })
        expect(plan.totalVerses).toBe(
          input.tracks.reduce(
            (total, track) => total + countVerses(track.passages),
            0
          )
        )
      }),
      runs
    )
  })

  it("only uses active days, in a row, with a reading of each track", () => {
    fc.assert(
      fc.property(inputArbitrary, (input) => {
        const plan = tryGenerate(input)
        if (!plan) return
        const active = new Set(input.activeWeekdays)
        // The plan days are exactly the first active dates from the start.
        const expected: IsoDate[] = computeActiveDates({
          startDate: input.startDate,
          activeWeekdays: input.activeWeekdays!,
          count: plan.days.length,
        })
        expect(plan.days.map((day) => day.date)).toEqual(expected)
        expect(plan.endDate).toBe(expected.at(-1))
        for (const day of plan.days) {
          expect(active.has(getWeekday(day.date))).toBe(true)
          for (let track = 0; track < input.tracks.length; track++) {
            expect(
              day.readings.some((reading) => reading.track === track)
            ).toBe(true)
          }
          expect(day.verses).toBe(
            day.readings.reduce((total, reading) => total + reading.verses, 0)
          )
        }
      }),
      runs
    )
  })

  it("follows the pace", () => {
    fc.assert(
      fc.property(inputArbitrary, (input) => {
        const plan = tryGenerate(input)
        if (!plan) return
        const { pace } = input
        if (pace.mode === "days") {
          expect(plan.days).toHaveLength(pace.days)
        } else if (pace.mode === "endDate") {
          expect(plan.endDate <= pace.endDate).toBe(true)
          const next = computeActiveDates({
            startDate: addDays(plan.endDate, 1),
            activeWeekdays: input.activeWeekdays!,
            count: 1,
          })[0]!
          // No active day is left unused before the end date.
          expect(next > pace.endDate).toBe(true)
        } else {
          // The minutes size the plan: an average day fits in them.
          expect(plan.days).toHaveLength(
            minutesPlanDays(input.tracks, pace.minutes, pace.readingWpm)
          )
          const perDay = versesForMinutes(pace.minutes, pace.readingWpm)
          expect(plan.totalVerses / plan.days.length).toBeLessThanOrEqual(
            perDay
          )
        }
      }),
      runs
    )
  })

  it("keeps the load of every day close to the average", () => {
    fc.assert(
      fc.property(inputArbitrary, (input) => {
        const plan = tryGenerate(input)
        if (!plan) return
        input.tracks.forEach((track, index) => {
          const loads = plan.days.map((day) =>
            day.readings
              .filter((reading) => reading.track === index)
              .reduce((total, reading) => total + reading.verses, 0)
          )
          const average = countVerses(track.passages) / plan.days.length
          // No unit is longer than twice the average, and a day stays within
          // two units of the average.
          const longestUnit = Math.ceil(2 * average)
          for (const load of loads) {
            expect(load).toBeGreaterThanOrEqual(1)
            expect(load).toBeLessThanOrEqual(average + 2 * longestUnit)
          }
        })
      }),
      runs
    )
  })

  it("is deterministic", () => {
    fc.assert(
      fc.property(inputArbitrary, (input) => {
        const first = tryGenerate(input)
        expect(tryGenerate(input)).toEqual(first)
      }),
      { numRuns: 50 }
    )
  })
})
