import { describe, expect, it } from "vitest"

import {
  pickReminderTopics,
  reminderContent,
  remainingReadings,
  type ContentTranslator,
  type ReminderPlan,
} from "./content"
import { parseReference } from "../bible/parse"
import type { Passage } from "../bible/passage"

const passage = (reference: string): Passage => parseReference(reference)![0]!

/** Echoes the key and the values, to see which message was asked for. */
const t: ContentTranslator = (key, values) =>
  values
    ? `${key}(${Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")})`
    : key

function plan(
  readings: { id: string; reference: string; done: boolean }[],
  overrides: Partial<ReminderPlan> = {}
): ReminderPlan {
  return {
    isToday: true,
    day: {
      readings: readings.map(({ id, reference, done }) => ({
        id,
        passage: passage(reference),
        completedAt: done ? new Date() : null,
      })),
    },
    ...overrides,
  }
}

describe("remainingReadings", () => {
  it("lists the readings of today that are not read, over all the plans", () => {
    const left = remainingReadings([
      plan([
        { id: "a", reference: "Mt 6", done: false },
        { id: "b", reference: "Mt 7", done: true },
      ]),
      plan([{ id: "c", reference: "Ps 23", done: false }]),
    ])
    expect(left.map(({ id }) => id)).toEqual(["a", "c"])
  })

  it("leaves out a plan whose next reading day is not today", () => {
    expect(
      remainingReadings([
        plan([{ id: "a", reference: "Mt 6", done: false }], { isToday: false }),
      ])
    ).toEqual([])
  })
})

describe("reminderContent: reading", () => {
  const base = {
    kind: "READING" as const,
    locale: "fr" as const,
    verse: null,
    t,
  }

  it("is skipped when everything planned today is read", () => {
    expect(
      reminderContent({
        ...base,
        plans: [plan([{ id: "a", reference: "Mt 6", done: true }])],
      })
    ).toBeNull()
  })

  it("is skipped when no plan has a reading today but plans exist", () => {
    expect(
      reminderContent({
        ...base,
        plans: [
          plan([{ id: "a", reference: "Mt 6", done: false }], {
            isToday: false,
          }),
        ],
      })
    ).toBeNull()
  })

  it("names the passages left and leads to the first, to be marked as read", () => {
    const content = reminderContent({
      ...base,
      plans: [
        plan([
          { id: "r1", reference: "Mt 6", done: false },
          { id: "r2", reference: "Ps 23", done: false },
        ]),
      ],
    })!
    expect(content.body).toBe(
      "READING.bodyWith(passages=Matthieu 6 et Psaume 23)"
    )
    expect(content.href).toBe("/read/Matt.6?reading=r1")
    expect(content.actions).toEqual([
      { action: "today", title: "READING.action", href: "/today" },
    ])
  })

  it("is a plain invitation to Today for someone without a plan", () => {
    expect(reminderContent({ ...base, plans: [] })).toEqual({
      title: "READING.title",
      body: "READING.body",
      href: "/today",
    })
  })
})

describe("reminderContent: meditation and prayer", () => {
  it("gives the verse of the day to meditate, with a link to it", () => {
    const content = reminderContent({
      kind: "MEDITATION",
      locale: "fr",
      plans: [],
      verse: passage("Ph 4:19"),
      t,
    })!
    expect(content.body).toBe("MEDITATION.bodyWith(reference=Philippiens 4:19)")
    expect(content.href).toBe("/read/Phil.4.19")
  })

  it("has a plain invitation without a verse, and for prayer without a request", () => {
    expect(
      reminderContent({
        kind: "MEDITATION",
        locale: "fr",
        plans: [],
        verse: null,
        t,
      })
    ).toEqual({ title: "MEDITATION.title", body: "MEDITATION.body" })
    expect(
      reminderContent({
        kind: "PRAYER",
        locale: "fr",
        plans: [],
        verse: null,
        t,
      })
    ).toEqual({ title: "PRAYER.title", body: "PRAYER.body", href: "/prayer" })
  })
})

describe("pickReminderTopics", () => {
  const requests = ["A", "B", "C", "D", "E", "F", "G"]

  it("names all of them when there are three or fewer", () => {
    expect(pickReminderTopics([], 5)).toEqual([])
    expect(pickReminderTopics(["A", "B"], 5)).toEqual(["A", "B"])
    expect(pickReminderTopics(["A", "B", "C"], 9)).toEqual(["A", "B", "C"])
  })

  it("takes three, a different three each day", () => {
    const days = [0, 1, 2].map((day) => pickReminderTopics(requests, day))
    expect(days).toEqual([
      ["A", "B", "C"],
      ["D", "E", "F"],
      ["G", "A", "B"],
    ])
    for (const day of days) expect(new Set(day).size).toBe(3)
  })

  it("starts from the same place for the same day", () => {
    expect(pickReminderTopics(requests, 20_000)).toEqual(
      pickReminderTopics(requests, 20_000)
    )
  })

  it("holds for days before the epoch", () => {
    expect(pickReminderTopics(requests, -1)).toHaveLength(3)
  })
})

describe("prayer reminders", () => {
  const prayer = (topics: string[]) =>
    reminderContent({
      kind: "PRAYER",
      locale: "fr",
      plans: [],
      verse: null,
      topics,
      t,
    })

  it("names the requests to pray for, and opens the journal", () => {
    expect(prayer(["Pour Marie", "Ma famille"])).toMatchObject({
      body: "PRAYER.bodyWith(topics=Pour Marie et Ma famille)",
      href: "/prayer",
    })
  })

  it("is a plain invitation when there is no request", () => {
    expect(prayer([])).toMatchObject({ body: "PRAYER.body", href: "/prayer" })
  })

  it("cuts a long title for the notification", () => {
    const body = prayer(["x".repeat(100)])!.body
    expect(body.length).toBeLessThan(80)
    expect(body).toContain("…")
  })
})
