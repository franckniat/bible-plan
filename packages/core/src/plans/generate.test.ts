import { describe, expect, it } from "vitest"

import { books } from "../bible/books"
import { formatPassages } from "../bible/format"
import { parseReference } from "../bible/parse"
import { bookPassage, coversWholeChapters } from "../bible/passage"
import { countVerses, estimateReadingMinutes } from "../bible/weight"
import { getWeekday } from "./dates"
import { generatePlan } from "./generate"
import {
  PlanGenerationError,
  type PlanDay,
  type PlanInput,
  type PlanReading,
} from "./schema"

const newTestament = books
  .filter((book) => book.testament === "new")
  .map((book) => bookPassage(book.id))

const track = (reference: string) => ({ passages: parseReference(reference)! })

const wholeChapters = (reading: PlanReading) =>
  coversWholeChapters(reading.passage)

const readings = (day: PlanDay) =>
  formatPassages(
    day.readings.map((reading) => reading.passage),
    "fr"
  )

describe("generatePlan", () => {
  it("reads the New Testament in 90 days without Sundays", () => {
    const plan = generatePlan({
      tracks: [{ passages: newTestament }],
      startDate: "2026-11-01", // a Sunday
      activeWeekdays: [1, 2, 3, 4, 5, 6],
      pace: { mode: "days", days: 90 },
    })

    expect(plan.days).toHaveLength(90)
    expect(plan.days.every((day) => getWeekday(day.date) !== 0)).toBe(true)
    expect(plan.days[0]!.date).toBe("2026-11-02")
    expect(plan.totalVerses).toBe(7957)
    expect(plan.days.reduce((total, day) => total + day.verses, 0)).toBe(7957)
    expect(
      formatPassages(
        plan.days[0]!.readings.map((r) => r.passage),
        "fr"
      )
    ).toMatch(/^Matthieu 1/)
    expect(plan.days.at(-1)!.readings.at(-1)!.passage.book).toBe("Rev")
    // About 88 verses a day; whole chapters only, so some spread remains.
    const verses = plan.days.map((day) => day.verses)
    expect(Math.min(...verses)).toBeGreaterThan(40)
    expect(Math.max(...verses)).toBeLessThan(140)
  })

  it("fills every active day up to the end date", () => {
    const plan = generatePlan({
      tracks: [track("Jn")],
      startDate: "2026-10-01",
      pace: { mode: "endDate", endDate: "2026-10-21" },
    })
    expect(plan.days).toHaveLength(21)
    expect(plan.endDate).toBe("2026-10-21")
    expect(plan.days.map((day) => day.day)).toEqual(
      Array.from({ length: 21 }, (_, index) => index + 1)
    )
    expect(
      formatPassages(
        plan.days.map((day) => day.readings[0]!.passage),
        "en"
      )
    ).toBe(
      Array.from({ length: 21 }, (_, index) => `John ${index + 1}`).join("; ")
    )
  })

  it("groups several chapters into one reading", () => {
    const plan = generatePlan({
      tracks: [track("Gn 1-6")],
      startDate: "2026-10-01",
      pace: { mode: "days", days: 2 },
    })
    expect(
      plan.days.map((day) =>
        formatPassages(
          day.readings.map((r) => r.passage),
          "fr"
        )
      )
    ).toEqual(["Genèse 1–3", "Genèse 4–6"])
  })

  it("sizes the plan from the minutes per day", () => {
    const plan = generatePlan({
      tracks: [{ passages: newTestament }],
      startDate: "2026-11-01",
      activeWeekdays: [1, 2, 3, 4, 5, 6],
      pace: { mode: "minutesPerDay", minutes: 15, readingWpm: 180 },
    })
    // 15 minutes at 180 words/min: 108 verses; 7,957 verses take 74 days.
    expect(plan.days).toHaveLength(74)
    const average = plan.totalVerses / plan.days.length
    expect(estimateReadingMinutes(average, 180)).toBeLessThanOrEqual(15)
    // A guide rather than a limit: whole chapters, so some days are longer.
    expect(plan.days.every((day) => day.readings.every(wholeChapters))).toBe(
      true
    )
    expect(plan.days.every((day) => getWeekday(day.date) !== 0)).toBe(true)
    expect(plan.days.reduce((total, day) => total + day.verses, 0)).toBe(7957)
  })

  it("cuts chapters much longer than the time given", () => {
    const plan = generatePlan({
      tracks: [track("Ps 119")],
      startDate: "2026-10-01",
      pace: { mode: "minutesPerDay", minutes: 5, readingWpm: 130 },
    })
    // 5 minutes at 130 words/min: 26 verses, so 176 verses take 7 days.
    expect(plan.days).toHaveLength(7)
    expect(plan.days.every((day) => day.verses >= 20 && day.verses <= 30)).toBe(
      true
    )
    expect(readings(plan.days[0]!)).toMatch(/^Psaume 119:1–/)
  })

  it("reads several tracks every day", () => {
    const oldTestament = books
      .filter((book) => book.testament === "old")
      .map((book) => bookPassage(book.id))
    const plan = generatePlan({
      tracks: [{ passages: oldTestament }, { passages: newTestament }],
      startDate: "2027-01-01",
      pace: { mode: "days", days: 365 },
    })

    expect(plan.days).toHaveLength(365)
    expect(plan.totalVerses).toBe(31102)
    for (const day of plan.days) {
      const tracks = day.readings.map((reading) => reading.track)
      // Old Testament first, then New Testament, both every day.
      expect(tracks[0]).toBe(0)
      expect(tracks.at(-1)).toBe(1)
      expect([...tracks].sort()).toEqual(tracks)
    }
    const versesOf = (track: number) =>
      plan.days
        .flatMap((day) => day.readings)
        .filter((reading) => reading.track === track)
        .reduce((total, reading) => total + reading.verses, 0)
    expect(versesOf(0)).toBe(23145)
    expect(versesOf(1)).toBe(7957)
    expect(readings(plan.days[0]!)).toMatch(/^Genèse 1.*; Matthieu 1/)
  })

  it("counts the minutes per day for all tracks together", () => {
    const plan = generatePlan({
      tracks: [track("Pr"), track("Ps 1-50")],
      startDate: "2026-10-01",
      pace: { mode: "minutesPerDay", minutes: 10, readingWpm: 180 },
    })
    // 10 minutes at 180 words/min: 72 verses a day for both tracks together.
    expect(plan.days).toHaveLength(
      Math.ceil(countVerses(parseReference("Pr; Ps 1-50")!) / 72)
    )
    expect(
      plan.days.every((day) =>
        [0, 1].every((track) =>
          day.readings.some((reading) => reading.track === track)
        )
      )
    ).toBe(true)
    expect(plan.totalVerses).toBe(countVerses(parseReference("Pr; Ps 1-50")!))
  })

  it("needs every track to have a reading each day", () => {
    expect(() =>
      generatePlan({
        tracks: [track("Gn 1-50"), track("Ps 117")],
        startDate: "2026-10-01",
        pace: { mode: "days", days: 10 },
      })
    ).toThrow(/too_many_days/)
  })

  it("rejects an invalid input", () => {
    const input = {
      tracks: [],
      startDate: "2026-10-01",
      pace: { mode: "days", days: 2 },
    } as PlanInput
    expect(() => generatePlan(input)).toThrow()
  })

  it("cuts very long chapters", () => {
    const plan = generatePlan({
      tracks: [track("Ps 118-120")],
      startDate: "2026-10-01",
      pace: { mode: "days", days: 4 },
    })
    expect(plan.days.map((day) => readings(day))).toEqual([
      "Psaume 118",
      "Psaume 119:1–88",
      "Psaume 119:89–176",
      "Psaume 120",
    ])
  })

  it("cuts chapters when there are more days than chapters", () => {
    const plan = generatePlan({
      tracks: [track("Gn 1-3")],
      startDate: "2026-10-01",
      pace: { mode: "days", days: 5 },
    })
    expect(plan.days).toHaveLength(5)
    expect(plan.days.every((day) => day.verses >= 12)).toBe(true)
  })

  it("rejects more days than verses to read", () => {
    const run = () =>
      generatePlan({
        tracks: [track("Ps 117")],
        startDate: "2026-10-01",
        pace: { mode: "days", days: 3 },
      })
    expect(run).toThrow(PlanGenerationError)
    expect(run).toThrow(/too_many_days/)
  })
})

describe("generatePlan by chapters per day", () => {
  const input = (reference: string, chapters: number): PlanInput => ({
    tracks: [track(reference)],
    startDate: "2026-11-02",
    pace: { mode: "chaptersPerDay", chapters },
  })

  it("reads the same number of chapters every day, in order", () => {
    // Genesis 1 to 50 and Exodus: 3 chapters a day.
    const plan = generatePlan(input("Gn", 3))
    expect(plan.days).toHaveLength(Math.ceil(50 / 3))
    expect(readings(plan.days[0]!)).toBe("Genèse 1–3")
    expect(readings(plan.days[1]!)).toBe("Genèse 4–6")
    // 50 chapters: the last day has the 2 that remain.
    expect(readings(plan.days.at(-1)!)).toBe("Genèse 49–50")
  })

  it("goes over from one book to the next without a gap", () => {
    // Ruth has 4 chapters, then Esther's 10: 14 chapters, 5 a day.
    const plan = generatePlan({
      tracks: [
        { passages: [bookPassage("Ruth"), bookPassage("Esth")] },
      ],
      startDate: "2026-11-02",
      pace: { mode: "chaptersPerDay", chapters: 5 },
    })
    expect(plan.days).toHaveLength(3)
    expect(readings(plan.days[0]!)).toBe("Ruth 1–4; Esther 1")
    expect(readings(plan.days[1]!)).toBe("Esther 2–6")
    expect(readings(plan.days[2]!)).toBe("Esther 7–10")
  })

  it("reads one chapter a day for as many days as there are chapters", () => {
    const plan = generatePlan(input("Jn", 1))
    expect(plan.days).toHaveLength(21)
    expect(plan.endDate).toBe("2026-11-22")
  })

  it("covers every verse once whatever the number of chapters", () => {
    for (const chapters of [1, 2, 3, 7, 50]) {
      const plan = generatePlan(input("Mt", chapters))
      const verses = plan.days.reduce((total, day) => total + day.verses, 0)
      expect(verses).toBe(plan.totalVerses)
    }
  })

  it("skips the days that are not read, like the other paces", () => {
    const plan = generatePlan({
      ...input("Jn", 7),
      startDate: "2026-11-02", // a Monday
      activeWeekdays: [1, 3, 5],
    })
    expect(plan.days.map((day) => getWeekday(day.date))).toEqual([1, 3, 5])
  })

  it("keeps a shorter track going no further than its chapters", () => {
    const plan = generatePlan({
      tracks: [track("Jn"), track("Jude")],
      startDate: "2026-11-02",
      pace: { mode: "chaptersPerDay", chapters: 1 },
    })
    // John lasts 21 days, Jude is one chapter: read on the first day only.
    expect(plan.days).toHaveLength(21)
    expect(plan.days[0]!.readings).toHaveLength(2)
    expect(plan.days[1]!.readings).toHaveLength(1)
  })

  it("reads the whole Bible at a chapter a day, within the plan limit", () => {
    const wholeBible = books.map((book) => bookPassage(book.id))
    const plan = generatePlan({
      tracks: [{ passages: wholeBible }],
      startDate: "2026-11-02",
      pace: { mode: "chaptersPerDay", chapters: 1 },
    })
    expect(plan.days).toHaveLength(1189)
  })
})
