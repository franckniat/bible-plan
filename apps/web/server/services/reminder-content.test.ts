import { describe, expect, it } from "vitest"

import { parseReference, type Passage } from "@workspace/core"

import {
  reminderContent,
  remainingReadings,
  type ContentTranslator,
} from "./reminder-content"
import type { TodayPlan } from "./plans"

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
  overrides: Partial<TodayPlan> = {}
): TodayPlan {
  return {
    id: "plan-1",
    title: "Plan",
    trackNames: [],
    completedReadings: 0,
    totalReadings: readings.length,
    isToday: true,
    lateReadings: 0,
    catchUpStrategy: "SHIFT",
    day: {
      date: "2026-10-19",
      dayNumber: 1,
      verses: 10,
      readings: readings.map(({ id, reference, done }) => ({
        id,
        passage: passage(reference),
        verses: 5,
        track: 0,
        completedAt: done ? new Date() : null,
      })),
    },
    ...overrides,
  } as TodayPlan
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

  it("has a plain invitation without a verse, and for prayer", () => {
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
    ).toEqual({ title: "PRAYER.title", body: "PRAYER.body" })
  })
})
