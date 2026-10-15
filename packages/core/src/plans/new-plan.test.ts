import { describe, expect, it } from "vitest"

import { parseReference } from "../bible/parse"
import { newPlanSchema, resolveNewPlan } from "./new-plan"
import { getPlanTemplate } from "./templates"

const schedule = {
  startDate: "2027-01-01",
  pace: { mode: "days", days: 30 },
} as const

describe("newPlanSchema", () => {
  it("accepts a template by key", () => {
    const parsed = newPlanSchema.parse({
      source: "template",
      templateKey: "gospels-30-days",
      ...schedule,
    })
    expect(parsed.activeWeekdays).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it("accepts chosen passages with a title", () => {
    const parsed = newPlanSchema.parse({
      source: "custom",
      title: "  Jean  ",
      passages: parseReference("Jn"),
      ...schedule,
    })
    expect(parsed.source === "custom" && parsed.title).toBe("Jean")
  })

  it.each([
    [
      "an unknown template",
      { source: "template", templateKey: "nope", ...schedule },
      "unknown_template",
    ],
    [
      "a custom plan without title",
      {
        source: "custom",
        title: " ",
        passages: parseReference("Jn"),
        ...schedule,
      },
      "required",
    ],
    [
      "an end date before the start",
      {
        source: "template",
        templateKey: "gospels-30-days",
        startDate: "2027-01-10",
        pace: { mode: "endDate", endDate: "2027-01-01" },
      },
      "end_before_start",
    ],
  ])("rejects %s", (_, input, code) => {
    const result = newPlanSchema.safeParse(input)
    expect(result.error?.issues.map((issue) => issue.message)).toContain(code)
  })

  it("rejects passages outside the canon", () => {
    const result = newPlanSchema.safeParse({
      source: "custom",
      title: "Jean",
      passages: [
        {
          book: "John",
          start: { chapter: 22, verse: 1 },
          end: { chapter: 22, verse: 2 },
        },
      ],
      ...schedule,
    })
    expect(result.success).toBe(false)
  })
})

describe("resolveNewPlan", () => {
  it("takes the passages and title of a template", () => {
    const resolved = resolveNewPlan(
      newPlanSchema.parse({
        source: "template",
        templateKey: "psalms-proverbs-31-days",
        startDate: "2027-01-01",
        activeWeekdays: [1, 2, 3, 4, 5],
        pace: { mode: "days", days: 31 },
      }),
      "en"
    )
    const template = getPlanTemplate("psalms-proverbs-31-days")!
    expect(resolved.title).toBe("Psalms and Proverbs in a month")
    expect(resolved.templateKey).toBe(template.key)
    expect(resolved.tracks).toBe(template.tracks)
    expect(resolved.input.activeWeekdays).toEqual([1, 2, 3, 4, 5])
    expect(resolved.input.tracks).toHaveLength(2)
  })

  it("keeps a title chosen for a template", () => {
    const resolved = resolveNewPlan(
      newPlanSchema.parse({
        source: "template",
        templateKey: "gospels-30-days",
        title: "Avec ma famille",
        ...schedule,
      }),
      "fr"
    )
    expect(resolved.title).toBe("Avec ma famille")
  })

  it("makes one track of the chosen passages", () => {
    const passages = parseReference("Jn; 1 Jn")!
    const resolved = resolveNewPlan(
      newPlanSchema.parse({
        source: "custom",
        title: "Jean",
        passages,
        ...schedule,
      }),
      "fr"
    )
    expect(resolved.templateKey).toBeNull()
    expect(resolved.tracks).toEqual([{ passages }])
    expect(resolved.input.pace).toEqual({ mode: "days", days: 30 })
  })
})
