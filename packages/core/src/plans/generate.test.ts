import { describe, expect, it } from "vitest"

import { books } from "../bible/books"
import { formatPassages } from "../bible/format"
import { parseReference } from "../bible/parse"
import { bookPassage } from "../bible/passage"
import { getWeekday } from "./dates"
import { generatePlan } from "./generate"
import { PlanGenerationError, type PlanInput } from "./schema"

const newTestament = books
  .filter((book) => book.testament === "new")
  .map((book) => bookPassage(book.id))

const track = (reference: string) => ({ passages: parseReference(reference)! })

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

  it("rejects an invalid input", () => {
    const input = {
      tracks: [],
      startDate: "2026-10-01",
      pace: { mode: "days", days: 2 },
    } as PlanInput
    expect(() => generatePlan(input)).toThrow()
  })

  it("rejects more days than units to read", () => {
    expect(() =>
      generatePlan({
        tracks: [track("Gn 1-3")],
        startDate: "2026-10-01",
        pace: { mode: "days", days: 5 },
      })
    ).toThrow(PlanGenerationError)
  })
})
