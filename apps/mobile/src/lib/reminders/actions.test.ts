import { describe, expect, it, vi } from "vitest"

vi.mock("react-native", () => ({ Platform: { OS: "web" } }))
vi.mock("expo-notifications", () => ({}))
vi.mock("expo-router", () => ({ router: {} }))
vi.mock("@/i18n/provider", () => ({ messages: {} }))
vi.mock("@/i18n/locale", () => ({ phoneLocale: () => "fr" }))
vi.mock("@/repositories/plans", () => ({}))
vi.mock("@/repositories/prayers", () => ({}))
vi.mock("@/repositories/profile", () => ({}))
vi.mock("@/repositories/reminders", () => ({}))
vi.mock("./schedule", () => ({}))

const { reminderAction } = await import("./actions")

const data = {
  kind: "reminder",
  href: "/read/John.3?reading=x",
  readingIds: ["x", "y"],
  requestIds: ["p"],
}

describe("reminderAction", () => {
  it("opens what the reminder is about when tapped", () => {
    expect(
      reminderAction("expo.modules.notifications.actions.DEFAULT", data)
    ).toEqual({ type: "open", href: "/read/John.3?reading=x" })
  })

  it("acts on the readings and the requests named", () => {
    expect(reminderAction("mark-read", data)).toEqual({
      type: "read",
      readingIds: ["x", "y"],
    })
    expect(reminderAction("prayed", data)).toEqual({
      type: "prayed",
      requestIds: ["p"],
    })
    expect(reminderAction("later", data)).toEqual({ type: "later" })
    expect(reminderAction("meditate", data)).toEqual({ type: "meditate" })
  })

  it("skips the prayer time it announces", () => {
    expect(
      reminderAction("skip", {
        kind: "reminder",
        reminderId: "r1",
        startsAt: "2026-10-31T07:30:00.000Z",
      })
    ).toEqual({
      type: "skip",
      reminderId: "r1",
      startsAt: "2026-10-31T07:30:00.000Z",
    })
  })

  it("leaves other notifications alone", () => {
    expect(reminderAction("later", { kind: "session-end" })).toBeNull()
  })
})
