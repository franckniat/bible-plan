import { describe, expect, it } from "vitest"

import { renderTestEmail } from "./test-email"

describe("renderTestEmail", () => {
  it.each([
    ["fr", "Email de test de Bible Plan", "Tout fonctionne"],
    ["en", "Bible Plan test email", "Everything works"],
  ] as const)(
    "renders the %s version as HTML and text",
    async (locale, subject, heading) => {
      const email = await renderTestEmail(locale)
      expect(email.subject).toBe(subject)
      expect(email.html).toContain(`lang="${locale}"`)
      expect(email.html).toContain(heading)
      expect(email.text).toContain("Bible Plan")
      expect(email.text).not.toContain("<")
    }
  )
})
