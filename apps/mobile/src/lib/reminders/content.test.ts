import { createTranslator } from "use-intl"
import fr from "@workspace/i18n/messages/fr"
import type { ContentTranslator } from "@workspace/core"
import { describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  plans: [] as unknown[],
  titles: [] as string[],
}))

vi.mock("react-native", () => ({ Platform: { OS: "web" } }))
vi.mock("expo-notifications", () => ({}))
vi.mock("@/i18n/provider", () => ({ messages: {} }))
vi.mock("@/i18n/locale", () => ({ phoneLocale: () => "fr" }))
vi.mock("@/repositories/profile", () => ({ currentProfile: () => ({}) }))
vi.mock("@/repositories/reminders", () => ({ reminderBook: {} }))
vi.mock("@/repositories/plans", () => ({ plansOn: () => state.plans }))
vi.mock("@/repositories/prayers", () => ({
  activePrayers: () => state.titles.map((title) => ({ id: title, title })),
}))
vi.mock("./actions", () => ({
  categoryOf: (kind: string) => `reminder-${kind}`,
}))

const { contentOf } = await import("./schedule")

const t = createTranslator({
  locale: "fr",
  messages: fr,
  namespace: "Reminders.notification",
}) as unknown as ContentTranslator
const at = new Date("2026-10-31T06:30:00.000Z")
const run = (kind: "READING" | "PRAYER" | "MEDITATION") => ({
  reminderId: "r1",
  kind,
  at,
})
const john3 = {
  book: "John" as const,
  start: { chapter: 3, verse: 1 },
  end: { chapter: 3, verse: 36 },
}

describe("contentOf", () => {
  it("names the readings left on the day of the run, and opens the first", () => {
    state.plans = [
      {
        isToday: true,
        day: { readings: [{ id: "x", passage: john3, completedAt: null }] },
      },
    ]
    expect(contentOf(run("READING"), "Africa/Douala", "fr", t)).toMatchObject({
      title: "C’est l’heure de lire",
      body: "Au programme : Jean 3.",
      categoryIdentifier: "reminder-READING",
      data: {
        kind: "reminder",
        href: "/read/John.3?reading=x",
        readingIds: ["x"],
      },
    })
  })

  it("skips a reading reminder once today is read", () => {
    state.plans = [
      {
        isToday: true,
        day: { readings: [{ id: "x", passage: john3, completedAt: "now" }] },
      },
    ]
    expect(contentOf(run("READING"), "Africa/Douala", "fr", t)).toBeNull()
  })

  it("names prayer requests and the verse of the day", () => {
    state.titles = ["Marie"]
    expect(contentOf(run("PRAYER"), "Africa/Douala", "fr", t)).toMatchObject({
      body: "Pensez à prier pour : Marie.",
      data: { href: "/prayer", requestIds: ["Marie"] },
    })
    expect(
      contentOf(run("MEDITATION"), "Africa/Douala", "fr", t)?.body
    ).toMatch(/^Verset du jour\s: /)
  })
})
