import {
  achievementProgress,
  trophyKeys,
  type AchievementHistory,
} from "@workspace/core"
import { describe, expect, it } from "vitest"

import { achievementViews } from "./achievement-view"

const history: AchievementHistory = {
  readings: [],
  prayers: ["2026-10-28", "2026-10-29", "2026-10-30"],
  meditations: [],
  prayerTimes: [],
  notes: [],
  completedPlans: [],
}
const earned = [
  {
    id: "a",
    key: "first-prayer",
    level: 1,
    unlockedAt: "2026-10-28",
    updatedAt: "2026-10-28T08:00:00.000Z",
    seenAt: null,
  },
]

describe("achievementViews", () => {
  it("shows the level earned and the way to the next one", () => {
    const views = achievementViews(
      earned,
      achievementProgress(history, "2026-10-30"),
      trophyKeys
    )
    expect(views.find((view) => view.key === "first-prayer")).toMatchObject({
      level: 1,
      next: null,
      earned: { 1: "2026-10-28" },
    })
    expect(views.find((view) => view.key === "prayer")).toMatchObject({
      level: 0,
      count: 10,
      next: { value: 3, target: 10 },
    })
    expect(views.find((view) => view.key === "fidelity")?.next).toEqual({
      value: 3,
      target: 7,
    })
    expect(views.find((view) => view.key === "gospels")).toMatchObject({
      trophy: true,
      next: { value: 0, target: 4 },
    })
  })
})
