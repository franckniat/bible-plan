import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { bookIds } from "../bible/books"
import { bookPassage, chaptersPassage } from "../bible/passage"
import { addDays } from "../plans/dates"
import type { IsoDate } from "../schemas/common"
import {
  achievementProgress,
  evaluateAchievements,
  type AchievementHistory,
  type UnlockedAchievement,
} from "./evaluate"

const empty: AchievementHistory = {
  readings: [],
  prayers: [],
  meditations: [],
  prayerTimes: [],
  notes: [],
  completedPlans: [],
}

const start: IsoDate = "2026-01-01"
const days = (count: number, from: IsoDate = start) =>
  Array.from({ length: count }, (_, index) => addDays(from, index))

const find = (
  result: UnlockedAchievement[],
  key: string,
  level?: number
) => result.find((a) => a.key === key && (level ? a.level === level : true))

describe("evaluateAchievements", () => {
  it("is empty without history", () => {
    expect(evaluateAchievements(empty)).toEqual([])
  })

  it("celebrates the first reading, prayer and meditation on their day", () => {
    const result = evaluateAchievements({
      ...empty,
      readings: [
        { day: "2026-03-02", passage: chaptersPassage("Gen", 1) },
        { day: "2026-03-01", passage: chaptersPassage("Gen", 2) },
      ],
      prayers: ["2026-03-05"],
      meditations: ["2026-03-07"],
    })
    expect(find(result, "first-reading")?.unlockedAt).toBe("2026-03-01")
    expect(find(result, "first-prayer")?.unlockedAt).toBe("2026-03-05")
    expect(find(result, "first-meditation")?.unlockedAt).toBe("2026-03-07")
  })

  it("levels up prayer badges on the day of the 10th, 50th and 200th prayer", () => {
    const result = evaluateAchievements({ ...empty, prayers: days(200) })
    expect(find(result, "prayer", 1)?.unlockedAt).toBe(addDays(start, 9))
    expect(find(result, "prayer", 2)?.unlockedAt).toBe(addDays(start, 49))
    expect(find(result, "prayer", 3)?.unlockedAt).toBe(addDays(start, 199))
  })

  it("counts several prayers on one day separately", () => {
    const result = evaluateAchievements({
      ...empty,
      prayers: Array.from({ length: 10 }, () => start),
    })
    expect(find(result, "prayer", 1)?.unlockedAt).toBe(start)
  })

  it("earns fidelity from days in a row, from any activity", () => {
    const result = evaluateAchievements({
      ...empty,
      prayers: days(3),
      meditations: days(4, addDays(start, 3)),
    })
    expect(find(result, "fidelity", 1)?.unlockedAt).toBe(addDays(start, 6))
    expect(find(result, "fidelity", 2)).toBeUndefined()
  })

  it("does not bridge a missed day", () => {
    const result = evaluateAchievements({
      ...empty,
      prayers: [...days(3), ...days(4, addDays(start, 4))],
    })
    expect(find(result, "fidelity")).toBeUndefined()
  })

  it("keeps a badge after the streak breaks", () => {
    const result = evaluateAchievements({
      ...empty,
      prayers: [...days(7), "2027-06-01"],
    })
    expect(find(result, "fidelity", 1)).toBeDefined()
  })

  it("completes a book once every verse of every chapter is read", () => {
    const readings = [
      { day: "2026-02-01" as IsoDate, passage: chaptersPassage("Ruth", 1, 2) },
      { day: "2026-02-03" as IsoDate, passage: chaptersPassage("Ruth", 3) },
    ]
    expect(
      find(evaluateAchievements({ ...empty, readings }), "books", 1)
    ).toBeUndefined()
    const result = evaluateAchievements({
      ...empty,
      readings: [
        ...readings,
        { day: "2026-02-09" as IsoDate, passage: chaptersPassage("Ruth", 4) },
      ],
    })
    expect(find(result, "books", 1)?.unlockedAt).toBe("2026-02-09")
  })

  it("accepts a chapter read in two parts", () => {
    const result = evaluateAchievements({
      ...empty,
      readings: [
        {
          day: "2026-02-01",
          passage: {
            book: "Obad",
            start: { chapter: 1, verse: 1 },
            end: { chapter: 1, verse: 10 },
          },
        },
        {
          day: "2026-02-02",
          passage: {
            book: "Obad",
            start: { chapter: 1, verse: 11 },
            end: { chapter: 1, verse: 21 },
          },
        },
      ],
    })
    expect(find(result, "books", 1)?.unlockedAt).toBe("2026-02-02")
  })

  it("gives the psalms and gospels trophies when the books are complete", () => {
    const result = evaluateAchievements({
      ...empty,
      readings: [
        { day: "2026-04-01", passage: bookPassage("Ps") },
        { day: "2026-05-01", passage: bookPassage("Matt") },
        { day: "2026-05-02", passage: bookPassage("Mark") },
        { day: "2026-05-03", passage: bookPassage("Luke") },
        { day: "2026-05-04", passage: bookPassage("John") },
      ],
    })
    expect(find(result, "psalms")?.unlockedAt).toBe("2026-04-01")
    expect(find(result, "gospels")?.unlockedAt).toBe("2026-05-04")
    expect(find(result, "new-testament")).toBeUndefined()
    expect(find(result, "bible")).toBeUndefined()
  })

  it("gives the Bible trophy only with the 66 books", () => {
    const readings = bookIds.map((book, index) => ({
      day: addDays(start, index),
      passage: bookPassage(book),
    }))
    const all = evaluateAchievements({ ...empty, readings })
    expect(find(all, "bible")?.unlockedAt).toBe(addDays(start, 65))
    expect(find(all, "new-testament")?.unlockedAt).toBe(addDays(start, 65))
    expect(find(all, "books", 3)?.unlockedAt).toBe(addDays(start, 29))

    const missing = evaluateAchievements({
      ...empty,
      readings: readings.slice(1),
    })
    expect(find(missing, "bible")).toBeUndefined()
  })

  it("gives the plan trophy on the first completed plan", () => {
    const result = evaluateAchievements({
      ...empty,
      completedPlans: ["2026-08-02", "2026-06-01"],
    })
    expect(find(result, "plan-completed")?.unlockedAt).toBe("2026-06-01")
  })

  it("gives the regularity trophy for 300 active days in a year, not in a row", () => {
    // Every day except one in five: 292 of 365, not enough; then 300 days.
    const sparse = days(365).filter((_, index) => index % 5 !== 0)
    expect(
      find(evaluateAchievements({ ...empty, prayers: sparse }), "regularity-year")
    ).toBeUndefined()

    const enough = days(365).filter((_, index) => index % 7 !== 0)
    const result = evaluateAchievements({ ...empty, prayers: enough })
    expect(find(result, "regularity-year")).toBeDefined()
  })
})

const dayArb = fc
  .integer({ min: 0, max: 400 })
  .map((offset) => addDays(start, offset))
const eventsArb = fc.array(dayArb, { maxLength: 60 })
const historyArb: fc.Arbitrary<AchievementHistory> = fc.record({
  readings: fc.array(
    fc.record({
      day: dayArb,
      passage: fc.constantFrom(
        chaptersPassage("Ruth", 1, 4),
        chaptersPassage("Obad", 1),
        bookPassage("Jonah")
      ),
    }),
    { maxLength: 20 }
  ),
  prayers: eventsArb,
  meditations: eventsArb,
  prayerTimes: eventsArb,
  notes: eventsArb,
  completedPlans: fc.array(dayArb, { maxLength: 3 }),
})

const sorted = (list: UnlockedAchievement[]) =>
  JSON.stringify(
    [...list].sort((a, b) => a.key.localeCompare(b.key) || a.level - b.level)
  )

describe("evaluateAchievements (properties)", () => {
  it("does not depend on the order of the events", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        const reversed: AchievementHistory = {
          readings: [...history.readings].reverse(),
          prayers: [...history.prayers].reverse(),
          meditations: [...history.meditations].reverse(),
          prayerTimes: [...history.prayerTimes].reverse(),
          notes: [...history.notes].reverse(),
          completedPlans: [...history.completedPlans].reverse(),
        }
        expect(sorted(evaluateAchievements(reversed))).toBe(
          sorted(evaluateAchievements(history))
        )
      })
    )
  })

  it("never loses an achievement when events are added", () => {
    fc.assert(
      fc.property(historyArb, eventsArb, (history, more) => {
        const before = evaluateAchievements(history)
        const after = evaluateAchievements({
          ...history,
          prayers: [...history.prayers, ...more],
        })
        for (const earned of before) {
          const kept = after.find(
            (a) => a.key === earned.key && a.level === earned.level
          )
          expect(kept).toBeDefined()
          // Earlier events can only move the date earlier, never later.
          expect(kept!.unlockedAt <= earned.unlockedAt).toBe(true)
        }
      })
    )
  })

  it("lists each level of each achievement at most once", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        const keys = evaluateAchievements(history).map(
          (a) => `${a.key}:${a.level}`
        )
        expect(new Set(keys).size).toBe(keys.length)
      })
    )
  })
})

describe("achievementProgress", () => {
  it("shows the present situation, not what was once earned", () => {
    const progress = achievementProgress(
      { ...empty, prayers: [...days(7), "2026-06-01"] },
      "2026-06-01"
    )
    // The streak of 7 broke long ago: only today counts now.
    expect(progress.fidelity.value).toBe(1)
    expect(progress.prayer.value).toBe(8)
  })

  it("counts the books of a trophy already read", () => {
    const progress = achievementProgress(
      {
        ...empty,
        readings: [
          { day: "2026-05-01", passage: bookPassage("Matt") },
          { day: "2026-05-02", passage: bookPassage("Mark") },
        ],
      },
      "2026-05-02"
    )
    expect(progress.gospels).toEqual({ value: 2, target: 4 })
    expect(progress.psalms).toEqual({ value: 0, target: 1 })
    expect(progress.books.value).toBe(2)
  })
})
