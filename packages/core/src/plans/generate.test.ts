import { describe, expect, it } from "vitest"

import { books } from "../bible/books"
import { formatPassages } from "../bible/format"
import { parseReference } from "../bible/parse"
import { bookPassage } from "../bible/passage"
import { estimateReadingMinutes } from "../bible/weight"
import { getWeekday } from "./dates"
import { generatePlan } from "./generate"
import { PlanGenerationError, type PlanDay, type PlanInput } from "./schema"

const newTestament = books
  .filter((book) => book.testament === "new")
  .map((book) => bookPassage(book.id))

const track = (reference: string) => ({ passages: parseReference(reference)! })

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

  it("never goes beyond the minutes per day", () => {
    const plan = generatePlan({
      tracks: [{ passages: newTestament }],
      startDate: "2026-11-01",
      activeWeekdays: [1, 2, 3, 4, 5, 6],
      pace: { mode: "minutesPerDay", minutes: 15, readingWpm: 180 },
    })
    const minutes = plan.days.map((day) =>
      estimateReadingMinutes(day.verses, 180)
    )
    expect(Math.max(...minutes)).toBeLessThanOrEqual(15)
    // 7,957 verses at 108 verses (15 min) a day: at least 74 days. Whole
    // chapters rarely fill a day exactly, so it takes a few more.
    expect(plan.days.length).toBeGreaterThanOrEqual(74)
    expect(plan.days.length).toBeLessThanOrEqual(90)
    expect(plan.days.every((day) => getWeekday(day.date) !== 0)).toBe(true)
    expect(plan.days.reduce((total, day) => total + day.verses, 0)).toBe(7957)
  })

  it("cuts chapters longer than the time available", () => {
    const plan = generatePlan({
      tracks: [track("Ps 119")],
      startDate: "2026-10-01",
      pace: { mode: "minutesPerDay", minutes: 5, readingWpm: 130 },
    })
    // 5 minutes at 130 words/min: 26 verses at most.
    expect(plan.days).toHaveLength(7)
    expect(plan.days.every((day) => day.verses <= 26)).toBe(true)
    expect(readings(plan.days[0]!)).toBe("Psaume 119:1–26")
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
