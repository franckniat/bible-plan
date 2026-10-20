import { describe, expect, it } from "vitest"

import { activityLevel, buildHeatmap } from "./heatmap"

describe("activityLevel", () => {
  it("is 0 for a day with nothing", () => {
    expect(activityLevel(undefined)).toBe(0)
    expect(
      activityLevel({ readings: 0, prayers: 0, meditationSeconds: 0 })
    ).toBe(0)
  })

  it("grows with what was done, and stops at 4", () => {
    expect(
      activityLevel({ readings: 1, prayers: 0, meditationSeconds: 0 })
    ).toBe(2)
    expect(
      activityLevel({ readings: 1, prayers: 1, meditationSeconds: 0 })
    ).toBe(3)
    expect(
      activityLevel({ readings: 5, prayers: 5, meditationSeconds: 3600 })
    ).toBe(4)
  })

  it("counts a very short meditation as activity", () => {
    expect(
      activityLevel({ readings: 0, prayers: 0, meditationSeconds: 40 })
    ).toBe(1)
  })
})

describe("buildHeatmap", () => {
  // 2026-10-21 is a Wednesday.
  const today = "2026-10-21"

  it("makes columns of 7 days from Monday, the last holding today", () => {
    const weeks = buildHeatmap(new Map(), today, 3)
    expect(weeks).toHaveLength(3)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    const last = weeks[2]!
    expect(last[0]!.date).toBe("2026-10-19")
    expect(last[2]!.date).toBe(today)
    expect(weeks[0]![0]!.date).toBe("2026-10-05")
  })

  it("marks the days after today as future, with no level", () => {
    const last = buildHeatmap(new Map(), today, 1)[0]!
    expect(last.map((cell) => cell.future)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ])
  })

  it("puts the activity of a day on its own cell", () => {
    const days = new Map([
      [
        "2026-10-20",
        { readings: 1, prayers: 1, meditationSeconds: 600 },
      ],
    ])
    const last = buildHeatmap(days, today, 1)[0]!
    expect(last[1]!.date).toBe("2026-10-20")
    expect(last[1]!.level).toBe(4)
    expect(last[0]!.level).toBe(0)
  })

  it("starts a week on Monday when today is a Sunday", () => {
    const week = buildHeatmap(new Map(), "2026-10-25", 1)[0]!
    expect(week[0]!.date).toBe("2026-10-19")
    expect(week[6]!.date).toBe("2026-10-25")
    expect(week[6]!.future).toBe(false)
  })
})
