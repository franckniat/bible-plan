import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { bookIds } from "../bible/books"
import { formatPassages } from "../bible/format"
import { parseReference } from "../bible/parse"
import { chaptersPassage, type Passage } from "../bible/passage"
import { getChapterCount, getVerseCount } from "../bible/verse-counts"
import type { IsoDate, Weekday } from "../schemas/common"
import {
  getOverdueReadings,
  planCatchUp,
  rebuildSchedule,
  type CatchUpChanges,
  type ScheduleDay,
} from "./catch-up"
import { addDays, getWeekday } from "./dates"
import { generatePlan } from "./generate"
import { PlanGenerationError } from "./schema"

const everyDay: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** A stored plan: generated, with ids and the readings read so far. */
function schedule(
  tracks: Passage[][],
  {
    days,
    activeWeekdays = everyDay,
    done = () => false,
  }: {
    days: number
    activeWeekdays?: Weekday[]
    done?: (day: number, reading: number) => boolean
  }
): ScheduleDay[] {
  const plan = generatePlan({
    tracks: tracks.map((passages) => ({ passages })),
    startDate: "2027-01-01",
    activeWeekdays,
    pace: { mode: "days", days },
  })
  return plan.days.map((day, index) => ({
    id: `day-${index + 1}`,
    date: day.date,
    readings: day.readings.map((reading, position) => ({
      id: `reading-${index + 1}-${position}`,
      ...reading,
      done: done(index + 1, position),
    })),
  }))
}

/** Every verse of passages, in order. */
function verseKeys(passages: Passage[]): string[] {
  return passages.flatMap(({ book, start, end }) => {
    const keys: string[] = []
    for (let chapter = start.chapter; chapter <= end.chapter; chapter++) {
      const first = chapter === start.chapter ? start.verse : 1
      const last =
        chapter === end.chapter ? end.verse : getVerseCount(book, chapter)
      for (let verse = first; verse <= last; verse++) {
        keys.push(`${book} ${chapter}:${verse}`)
      }
    }
    return keys
  })
}

const genesis = parseReference("Gn 1-30")!
const late = (days: ScheduleDay[], today: IsoDate) =>
  getOverdueReadings(days, today).length

describe("getOverdueReadings", () => {
  it("lists unread readings planned before today", () => {
    const days = schedule([genesis], { days: 30, done: (day) => day === 2 })
    // Days 1 to 5 are past on January 6; day 2 was read.
    expect(
      getOverdueReadings(days, "2027-01-06").map((reading) => reading.id)
    ).toEqual(["reading-1-0", "reading-3-0", "reading-4-0", "reading-5-0"])
  })
})

describe("planCatchUp", () => {
  // Genesis 1 to 30, one chapter a day from January 1; nothing read by
  // January 6: five readings late.
  const days = schedule([genesis], { days: 30 })
  const options = {
    days,
    today: "2027-01-06",
    activeWeekdays: everyDay,
    endDate: "2027-01-30",
  }

  it("changes nothing when on time or with the free strategy", () => {
    expect(planCatchUp("SHIFT", { ...options, today: "2027-01-01" })).toBeNull()
    expect(planCatchUp("FREE", options)).toBeNull()
    expect(late(days, "2027-01-06")).toBe(5)
  })

  it("SHIFT keeps the daily load and moves the end date by the delay", () => {
    const changes = planCatchUp("SHIFT", options)!
    expect(changes.endDate).toBe("2027-02-04")
    expect(changes.removeReadings).toEqual([])
    expect(changes.addDays).toEqual([])
    expect(changes.moveDays).toHaveLength(30)
    expect(changes.moveDays[0]).toEqual({ dayId: "day-1", date: "2027-01-06" })
  })

  it("REDISTRIBUTE keeps the end date with longer days", () => {
    const changes = planCatchUp("REDISTRIBUTE", options)!
    expect(changes.endDate).toBe("2027-01-30")
    expect(changes.moveDays).toEqual([])
    expect(changes.removeReadings).toHaveLength(30)
    // 30 chapters over the 25 days from January 6 to 30.
    expect(changes.addDays).toHaveLength(25)
    expect(changes.addDays[0]!.date).toBe("2027-01-06")
    expect(
      formatPassages(
        changes.addDays.flatMap((day) =>
          day.readings.map((reading) => reading.passage)
        ),
        "en"
      )
    ).toMatch(/^Genesis 1/)
  })

  it("keeps the readings already read", () => {
    const partly = schedule([genesis], {
      days: 30,
      done: (day) => day === 2 || day === 7,
    })
    const changes = planCatchUp("REDISTRIBUTE", { ...options, days: partly })!
    expect(changes.removeReadings).not.toContain("reading-2-0")
    expect(changes.removeReadings).not.toContain("reading-7-0")
    expect(
      verseKeys(
        rebuildSchedule(partly, changes, () => "new")
          .days.flatMap((day) => day.readings)
          .map((reading) => reading.passage)
      ).sort()
    ).toEqual(verseKeys(genesis).sort())
  })

  it("SHIFT only moves the days from the first late one", () => {
    const partly = schedule([genesis], { days: 30, done: (day) => day <= 3 })
    const changes = planCatchUp("SHIFT", { ...options, days: partly })!
    expect(changes.moveDays[0]).toEqual({ dayId: "day-4", date: "2027-01-06" })
    expect(changes.endDate).toBe("2027-02-01")
  })

  it("follows the reading days of the week", () => {
    const weekdays: Weekday[] = [1, 3, 5]
    const sparse = schedule([genesis], { days: 30, activeWeekdays: weekdays })
    const today = sparse[4]!.date
    for (const strategy of ["SHIFT", "REDISTRIBUTE"] as const) {
      const changes = planCatchUp(strategy, {
        days: sparse,
        today,
        activeWeekdays: weekdays,
        endDate: sparse.at(-1)!.date,
      })!
      const dates = [
        ...changes.moveDays.map((move) => move.date),
        ...changes.addDays.map((day) => day.date),
      ]
      expect(dates.every((date) => weekdays.includes(getWeekday(date)))).toBe(
        true
      )
    }
  })

  it("keeps the tracks of a plan read in parallel", () => {
    const twoTracks = schedule(
      [parseReference("Ps 1-30")!, parseReference("Pr 1-30")!],
      {
        days: 30,
      }
    )
    const changes = planCatchUp("REDISTRIBUTE", {
      ...options,
      days: twoTracks,
    })!
    const proverbs = changes.addDays
      .flatMap((day) => day.readings)
      .filter((reading) => reading.track === 1)
      .map((reading) => reading.passage.book)
    expect(new Set(proverbs)).toEqual(new Set(["Prov"]))
  })

  it("cannot redistribute once the end date is past", () => {
    expect(() =>
      planCatchUp("REDISTRIBUTE", { ...options, today: "2027-02-10" })
    ).toThrow(PlanGenerationError)
  })
})

describe("planCatchUp properties", () => {
  const input = fc
    .record({
      book: fc.constantFrom(...bookIds),
      days: fc.integer({ min: 2, max: 60 }),
      lateBy: fc.integer({ min: 1, max: 40 }),
      read: fc.array(fc.boolean(), { minLength: 200, maxLength: 200 }),
      weekdays: fc.uniqueArray(fc.integer({ min: 0, max: 6 }), {
        minLength: 1,
        maxLength: 7,
      }),
    })
    .filter(({ book, days }) => {
      const passage = chaptersPassage(book, 1, getChapterCount(book))
      return verseKeys([passage]).length >= days
    })

  it.each(["SHIFT", "REDISTRIBUTE"] as const)(
    "%s keeps every verse once and never drops progress",
    (strategy) => {
      fc.assert(
        fc.property(input, ({ book, days: count, lateBy, read, weekdays }) => {
          const passage = chaptersPassage(book, 1, getChapterCount(book))
          const activeWeekdays = weekdays as Weekday[]
          const days = schedule([[passage]], {
            days: count,
            activeWeekdays,
            done: (day, reading) => read[(day * 3 + reading) % read.length]!,
          })
          const endDate = days.at(-1)!.date
          const today = addDays(days[0]!.date, lateBy)
          let changes: CatchUpChanges | null
          try {
            changes = planCatchUp(strategy, {
              days,
              today,
              activeWeekdays,
              endDate,
            })
          } catch (error) {
            // Only REDISTRIBUTE after the end date may fail.
            expect(strategy).toBe("REDISTRIBUTE")
            expect(error).toBeInstanceOf(PlanGenerationError)
            return
          }
          if (!changes) {
            expect(late(days, today)).toBe(0)
            return
          }

          const done = days.flatMap((day) => day.readings).filter((r) => r.done)
          for (const reading of done) {
            expect(changes.removeReadings).not.toContain(reading.id)
          }
          let next = 0
          const after = rebuildSchedule(
            days,
            changes,
            () => `new-${next++}`
          ).days
          expect(
            verseKeys(
              after.flatMap((day) => day.readings).map((r) => r.passage)
            ).sort()
          ).toEqual(verseKeys([passage]).sort())

          const newDates = [
            ...changes.moveDays.map((move) => move.date),
            ...changes.addDays.map((day) => day.date),
          ]
          for (const date of newDates) {
            expect(date >= today).toBe(true)
            expect(activeWeekdays.includes(getWeekday(date))).toBe(true)
          }
          // Every read reading keeps its id and its day.
          const readIn = new Map(
            after.flatMap((day) =>
              day.readings.filter((r) => r.done).map((r) => [r.id, day.id])
            )
          )
          for (const day of days)
            for (const reading of day.readings.filter((r) => r.done))
              expect(readIn.get(reading.id)).toBe(day.id)
          expect(after.map((day) => day.dayNumber)).toEqual(
            after.map((_, index) => index + 1)
          )
          expect(after.at(-1)!.date).toBe(changes.endDate)
          if (strategy === "SHIFT")
            expect(changes.endDate >= endDate).toBe(true)
          else
            expect(changes.endDate <= endDate || late(days, today) === 0).toBe(
              true
            )
        }),
        { numRuns: 200 }
      )
    }
  )
})

describe("rebuildSchedule", () => {
  const days = schedule([genesis], {
    days: 30,
    // Genesis 1 and 3 read; 2, 4 and 5 late on January 6.
    done: (day) => day === 1 || day === 3,
  })
  const ids = () => {
    let next = 0
    return () => `new-${next++}`
  }

  it("SHIFT moves the days and keeps every id", () => {
    const changes = planCatchUp("SHIFT", {
      days,
      today: "2027-01-06",
      activeWeekdays: everyDay,
      endDate: "2027-01-30",
    })!
    const rebuilt = rebuildSchedule(days, changes, ids())
    expect(rebuilt.days.map((day) => day.id)).toEqual(days.map((day) => day.id))
    expect(rebuilt.days.some((day) => day.created)).toBe(false)
    expect(rebuilt.removedDayIds).toEqual([])
    expect(rebuilt.days[1]).toMatchObject({ id: "day-2", date: "2027-01-06" })
    expect(rebuilt.endDate).toBe(changes.endDate)
    expect(rebuilt.totalReadings).toBe(30)
  })

  it("REDISTRIBUTE keeps read readings, adds new days and drops empty ones", () => {
    const changes = planCatchUp("REDISTRIBUTE", {
      days,
      today: "2027-01-06",
      activeWeekdays: everyDay,
      endDate: "2027-01-30",
    })!
    const rebuilt = rebuildSchedule(days, changes, ids())
    // Days 1 and 3 keep their read reading; the late days 2, 4 and 5 are
    // emptied, while the days from January 6 receive the spread readings.
    expect(rebuilt.days.slice(0, 2).map((day) => day.id)).toEqual([
      "day-1",
      "day-3",
    ])
    expect(rebuilt.removedDayIds).toEqual(["day-2", "day-4", "day-5"])
    // Days from January 6 exist already (moved readings join them).
    expect(rebuilt.days[2]).toMatchObject({ id: "day-6", date: "2027-01-06" })
    expect(rebuilt.days.every((day) => !day.created)).toBe(true)
    expect(rebuilt.days.map((day) => day.dayNumber)).toEqual(
      rebuilt.days.map((_, index) => index + 1)
    )
    expect(rebuilt.totalDays).toBe(rebuilt.days.length)
    expect(rebuilt.days[0]!.verses).toBe(days[0]!.readings[0]!.verses)
  })

  it("creates a day when no day is left on a new date", () => {
    const rebuilt = rebuildSchedule(
      days.slice(0, 2),
      {
        moveDays: [],
        removeReadings: [],
        addDays: [{ date: "2027-03-01", readings: [days[5]!.readings[0]!] }],
        endDate: "2027-03-01",
      },
      ids()
    )
    expect(rebuilt.days.at(-1)).toMatchObject({
      id: "new-0",
      date: "2027-03-01",
      created: true,
      dayNumber: 3,
    })
    expect(rebuilt.days.at(-1)!.readings[0]).toMatchObject({
      id: "new-1",
      done: false,
      created: true,
    })
  })

  it("never removes a read reading", () => {
    const rebuilt = rebuildSchedule(
      days,
      {
        moveDays: [],
        removeReadings: ["reading-1-0"],
        addDays: [],
        endDate: "2027-01-30",
      },
      ids()
    )
    expect(rebuilt.days[0]!.readings[0]!.id).toBe("reading-1-0")
  })
})
