import { describe, expect, it, vi } from "vitest"

import { verifyReminderToken } from "@/lib/reminder-token"

import { buildReminderEmail } from "./reminder-email"

// The Resend sender and the database are not needed to build an email.
vi.mock("@/server/email", () => ({ getEmailSender: vi.fn() }))

const secret = "a-long-enough-secret-for-the-tests"
const baseUrl = "https://bibleplan.example"
const reminder = {
  id: "r1",
  kind: "PRAYER" as const,
  channels: ["IN_APP" as const, "EMAIL" as const],
  user: {
    id: "u1",
    name: "Marie",
    email: "marie@example.com",
    emailVerified: true,
    locale: "en",
  },
}

describe("buildReminderEmail", () => {
  it("writes to the person, in their language, as a reminder", async () => {
    const email = await buildReminderEmail(reminder, { baseUrl, secret })
    expect(email.to).toBe("marie@example.com")
    expect(email.category).toBe("reminder")
    expect(email.subject).toBe("Time to pray")
    expect(email.html).toContain("https://bibleplan.example/en/today")
  })

  it("carries an unsubscribe link, in the body and in the headers", async () => {
    const email = await buildReminderEmail(reminder, { baseUrl, secret })
    const link = email.headers!["List-Unsubscribe"]!.slice(1, -1)
    expect(
      link.startsWith("https://bibleplan.example/api/reminders/unsubscribe")
    ).toBe(true)
    expect(
      verifyReminderToken(new URL(link).searchParams.get("token")!, secret)
    ).toBe("r1")
    expect(email.headers!["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click"
    )
    expect(email.text).toContain(link)
  })

  it("falls back to French for an unknown language", async () => {
    const email = await buildReminderEmail(
      { ...reminder, user: { ...reminder.user, locale: "de" } },
      { baseUrl, secret }
    )
    expect(email.subject).toBe("C’est l’heure de prier")
  })
})
