import { describe, expect, it } from "vitest"

import { reminderKinds } from "@workspace/core"

import { renderReminderEmail } from "./reminder-email"

const url = "https://bibleplan.example/fr/today"
const unsubscribeUrl =
  "https://bibleplan.example/api/reminders/unsubscribe?token=abc&x=1"

describe("renderReminderEmail", () => {
  it.each([
    ["fr", "READING", "C’est l’heure de votre lecture"],
    ["fr", "PRAYER", "C’est l’heure de prier"],
    ["fr", "MEDITATION", "C’est l’heure de méditer"],
    ["en", "READING", "Time for your reading"],
    ["en", "PRAYER", "Time to pray"],
    ["en", "MEDITATION", "Time to meditate"],
  ] as const)("renders the %s %s reminder", async (locale, kind, subject) => {
    const email = await renderReminderEmail(kind, locale, {
      name: "Marie",
      url,
      unsubscribeUrl,
    })
    expect(email.subject).toBe(subject)
    expect(email.html).toContain("Marie")
    expect(email.html).toContain(url)
    expect(email.html).toContain(unsubscribeUrl.replaceAll("&", "&amp;"))
    expect(email.text).toContain(unsubscribeUrl)
  })

  it("has a template for every kind of reminder", async () => {
    for (const kind of reminderKinds) {
      const email = await renderReminderEmail(kind, "en", {
        name: "Marie",
        url,
        unsubscribeUrl,
      })
      expect(email.subject).not.toContain("reminder.")
    }
  })
})
