import { describe, expect, it } from "vitest"

import { bookIds, books, type BookId } from "../bible/books"
import { formatPassage } from "../bible/format"
import type { Passage } from "../bible/passage"
import { getBookVerseCount, getChapterCount } from "../bible/verse-counts"
import { countVerses } from "../bible/weight"
import { locales } from "../schemas/common"
import { chronologicalOrder } from "./chronological-order"
import { generatePlan } from "./generate"
import {
  getPlanTemplate,
  planTemplates,
  references,
  templatePlanInput,
  type PlanTemplate,
} from "./templates"
import { toUnits } from "./units"

const template = (key: string): PlanTemplate => getPlanTemplate(key)!

/** Verses read per book over all the tracks of a template. */
function versesPerBook(value: PlanTemplate): Map<BookId, number> {
  const verses = new Map<BookId, number>()
  for (const track of value.tracks) {
    for (const unit of toUnits(track.passages)) {
      verses.set(unit.book, (verses.get(unit.book) ?? 0) + unit.verses)
    }
  }
  return verses
}

/**
 * "Gen 1", "Gen 2"... for every chapter of passages, in order. A chapter
 * split over several days (Ps 119:1–88, then 119:89–176) counts once.
 */
const chapters = (passages: readonly Passage[]) =>
  toUnits(passages)
    .map((unit) => `${unit.book} ${unit.chapter}`)
    .filter((chapter, index, all) => chapter !== all[index - 1])

describe("plan template registry", () => {
  it("has unique, stable keys", () => {
    const keys = planTemplates.map((value) => value.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(keys).toEqual([
      "bible-1-year",
      "chronological-1-year",
      "mcheyne-1-year",
      "new-testament-90-days",
      "gospels-30-days",
      "psalms-proverbs-31-days",
    ])
  })

  it.each(locales)(
    "has titles, descriptions and track names in %s",
    (locale) => {
      for (const value of planTemplates) {
        expect(value.title[locale].trim()).not.toBe("")
        expect(value.description[locale].trim()).not.toBe("")
        // Tracks are named whenever there are several of them.
        if (value.tracks.length > 1) {
          for (const track of value.tracks) {
            expect(track.name?.[locale].trim()).toBeTruthy()
          }
        }
      }
    }
  )

  it("finds a template by key", () => {
    expect(getPlanTemplate("gospels-30-days")?.days).toBe(30)
    expect(getPlanTemplate("unknown")).toBeUndefined()
  })

  it("fails loudly on an invalid reference", () => {
    expect(() => references("Gen 51")).toThrow(/Invalid template reference/)
  })
})

describe.each(planTemplates.map((value) => [value.key, value] as const))(
  "template %s",
  (_, value) => {
    it("generates its plan at the intended pace", () => {
      const plan = generatePlan(
        templatePlanInput(value, { startDate: "2027-01-01" })
      )
      expect(plan.days).toHaveLength(value.days)
      value.tracks.forEach((track, index) => {
        const read = plan.days
          .flatMap((day) => day.readings)
          .filter((reading) => reading.track === index)
          .map((reading) => reading.passage)
        expect(chapters(read)).toEqual(chapters(track.passages))
        expect(countVerses(read)).toBe(countVerses(track.passages))
      })
    })

    it("adapts to the reading days and to another pace", () => {
      const withoutSundays = generatePlan(
        templatePlanInput(value, {
          startDate: "2027-01-03",
          activeWeekdays: [1, 2, 3, 4, 5, 6],
        })
      )
      expect(withoutSundays.days).toHaveLength(value.days)
      expect(withoutSundays.days[0]!.date).toBe("2027-01-04")

      const byMinutes = generatePlan(
        templatePlanInput(value, {
          startDate: "2027-01-01",
          pace: { mode: "minutesPerDay", minutes: 20, readingWpm: 180 },
        })
      )
      expect(byMinutes.totalVerses).toBe(withoutSundays.totalVerses)
    })
  }
)

describe("template contents", () => {
  it("reads the whole Bible in a year", () => {
    const verses = versesPerBook(template("bible-1-year"))
    expect([...verses.keys()]).toEqual(bookIds)
    expect([...verses.values()].reduce((a, b) => a + b, 0)).toBe(31102)
  })

  it("reads the New Testament and the Gospels", () => {
    expect(
      countVerses(template("new-testament-90-days").tracks[0]!.passages)
    ).toBe(7957)
    expect([...versesPerBook(template("gospels-30-days")).keys()]).toEqual([
      "Matt",
      "Mark",
      "Luke",
      "John",
    ])
  })

  it("reads one chapter of Proverbs a day for a month", () => {
    const plan = generatePlan(
      templatePlanInput(template("psalms-proverbs-31-days"), {
        startDate: "2027-01-01",
      })
    )
    plan.days.forEach((day, index) => {
      const proverbs = day.readings.filter((reading) => reading.track === 1)
      expect(
        proverbs.map((reading) => formatPassage(reading.passage, "en"))
      ).toEqual([`Proverbs ${index + 1}`])
    })
  })

  it("reads, with M'Cheyne, the Old Testament once and the New Testament and Psalms twice", () => {
    const verses = versesPerBook(template("mcheyne-1-year"))
    for (const book of books) {
      const times = book.testament === "new" || book.id === "Ps" ? 2 : 1
      expect(verses.get(book.id)).toBe(times * getBookVerseCount(book.id))
    }
  })

  it("starts and ends M'Cheyne's year as his calendar does", () => {
    const plan = generatePlan(
      templatePlanInput(template("mcheyne-1-year"), { startDate: "2027-01-01" })
    )
    const books = (day: number) =>
      plan.days[day]!.readings.map((reading) => reading.passage.book)
    expect(books(0)).toEqual(["Gen", "Matt", "Ezra", "Acts"])
    expect(
      plan.days.at(-1)!.readings.map((reading) => {
        const { book, end } = reading.passage
        return `${book} ${end.chapter}`
      })
    ).toEqual(["2Chr 36", "Rev 22", "Mal 4", "John 21"])
  })
})

describe("chronological order", () => {
  const order = chapters(template("chronological-1-year").tracks[0]!.passages)
  const position = (chapter: string) => {
    const index = order.indexOf(chapter)
    expect(index, chapter).toBeGreaterThanOrEqual(0)
    return index
  }

  it("contains every chapter of the Bible exactly once", () => {
    const all = bookIds.flatMap((book) =>
      Array.from(
        { length: getChapterCount(book) },
        (_, index) => `${book} ${index + 1}`
      )
    )
    expect(order).toHaveLength(1189)
    expect([...order].sort()).toEqual([...all].sort())
  })

  it("is written as valid references", () => {
    for (const reference of chronologicalOrder) {
      expect(() => references(reference)).not.toThrow()
    }
  })

  it.each([
    ["Gen 11", "Job 1"],
    ["Job 42", "Gen 12"],
    ["Deut 34", "Ps 90"],
    ["1Sam 19", "Ps 59"],
    ["2Sam 12", "Ps 51"],
    ["2Sam 15", "Ps 3"],
    ["2Kgs 14", "Jonah 1"],
    ["2Kgs 25", "Lam 1"],
    ["Ezra 6", "Esth 1"],
    ["Mal 4", "Luke 1"],
    ["Acts 14", "Gal 1"],
    ["Acts 28", "Eph 1"],
  ])("reads %s before %s", (before, after) => {
    expect(position(before)).toBeLessThan(position(after))
  })

  it("starts with the creation and ends with Revelation", () => {
    expect(order[0]).toBe("Gen 1")
    expect(order.at(-1)).toBe("Rev 22")
  })
})
