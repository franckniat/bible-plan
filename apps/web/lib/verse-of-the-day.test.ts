import { describe, expect, it } from "vitest"

import { addDays, parseReference, toPassageSlug, type IsoDate } from "@workspace/core"

import pool from "@/content/verse-pool.json"
import verses from "@/content/verses-of-the-day.json"

import { findVerseOfTheDay, pickFromPool } from "./verse-of-the-day"

const calendar = {
  "2026-10-17": "Philippiens 4:19",
  "2026-10-20": "Jn 3:16",
}
const small = ["Ps 23:1", "Jn 3:16", "Rom 8:28", "Is 41:10"]

const slug = (date: string, references: readonly string[] = small) => {
  const passage = findVerseOfTheDay(date as IsoDate, "fr", calendar, references)
  return passage && toPassageSlug(passage)
}

describe("findVerseOfTheDay", () => {
  it("takes the verse chosen by hand for the day", () => {
    expect(slug("2026-10-17")).toBe("Phil.4.19")
    expect(slug("2026-10-20")).toBe("John.3.16")
  })

  it("draws a verse from the pool on the days without one", () => {
    const date = "2026-10-18"
    expect(small.map((ref) => toPassageSlug(parseReference(ref)![0]!))).toContain(
      slug(date)
    )
  })

  it("gives the same verse all day, whoever asks", () => {
    expect(slug("2026-11-02")).toBe(slug("2026-11-02"))
    expect(
      findVerseOfTheDay("2026-11-02", "fr", {}, pool)
    ).toEqual(findVerseOfTheDay("2026-11-02", "fr", {}, pool))
  })

  it("has no verse when there is neither a choice nor a pool", () => {
    expect(findVerseOfTheDay("2026-10-18", "fr", {}, [])).toBeNull()
  })
})

describe("pickFromPool", () => {
  const start = "2026-11-01" as IsoDate
  const days = (count: number, from: IsoDate = start) =>
    Array.from({ length: count }, (_, index) => addDays(from, index))

  it("does not repeat a verse until the whole pool has been seen", () => {
    const length = pool.length
    // Any window of one round, wherever it starts inside a round, may span two
    // rounds; a whole round from its first day never repeats.
    const firstOfRound = days(length * 3).find((day) => {
      const first = pickFromPool(day, pool)
      return (
        first !== pickFromPool(addDays(day, -1), pool) &&
        new Set(days(length, day).map((d) => pickFromPool(d, pool))).size ===
          length
      )
    })
    expect(firstOfRound).toBeDefined()
  })

  it("uses every verse of the pool within a round", () => {
    const seen = new Set<string>()
    for (const day of days(pool.length * 2)) seen.add(pickFromPool(day, pool)!)
    expect([...seen].sort()).toEqual([...pool].sort())
  })

  it("changes from one day to the next", () => {
    const picks = days(60).map((day) => pickFromPool(day, pool))
    const unchanged = picks.filter((pick, i) => i > 0 && pick === picks[i - 1])
    expect(unchanged).toHaveLength(0)
  })

  it("reshuffles for the next round", () => {
    const length = pool.length
    const order = (from: IsoDate) =>
      days(length, from).map((day) => pickFromPool(day, pool))
    // Two consecutive rounds, found from the day a round begins.
    const begin = days(length * 2).find(
      (day) =>
        new Set(order(day)).size === length &&
        pickFromPool(addDays(day, length), pool) !== undefined
    )!
    expect(order(begin)).not.toEqual(order(addDays(begin, length)))
  })

  it("is empty for an empty pool", () => {
    expect(pickFromPool(start, [])).toBeNull()
  })
})

describe("content/verse-pool.json", () => {
  it("has enough verses to go a long time without a repeat", () => {
    expect(pool.length).toBeGreaterThanOrEqual(100)
  })

  it("has no verse twice", () => {
    const slugs = pool.map((ref) => toPassageSlug(parseReference(ref)![0]!))
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it.each(pool.map((reference) => [reference]))(
    "%s is a valid reference, in both languages",
    (reference) => {
      expect(parseReference(reference, { locale: "fr" })).not.toBeNull()
      expect(parseReference(reference, { locale: "en" })).not.toBeNull()
    }
  )
})

describe("content/verses-of-the-day.json", () => {
  it.each(Object.entries(verses))(
    "%s: %s is a valid reference",
    (date, ref) => {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(findVerseOfTheDay(date as IsoDate, "fr")).not.toBeNull()
      expect(ref).toBeTruthy()
    }
  )
})
