import { describe, expect, it } from "vitest"

import { renderResetPasswordEmail, renderVerifyEmail } from "./action-email"

const url =
  "https://bibleplan.example/api/auth/verify-email?token=abc&callbackURL=%2Ffr"

describe("renderVerifyEmail", () => {
  it.each([
    // French puts a narrow no-break space before "!".
    ["fr", "Confirmez votre adresse email", "Bienvenue, Marie\u202F!"],
    ["en", "Confirm your email address", "Welcome, Marie!"],
  ] as const)(
    "renders the %s version with the link",
    async (locale, subject, heading) => {
      const email = await renderVerifyEmail(locale, { name: "Marie", url })
      expect(email.subject).toBe(subject)
      expect(email.html).toContain(heading)
      expect(email.html).toContain(url.replaceAll("&", "&amp;"))
      expect(email.text).toContain(url)
    }
  )
})

describe("renderResetPasswordEmail", () => {
  it("renders the reset link and the expiry notice", async () => {
    const email = await renderResetPasswordEmail("fr", { name: "Marie", url })
    expect(email.subject).toBe("Réinitialisez votre mot de passe")
    expect(email.text).toContain("valable une heure")
    expect(email.text).toContain(url)
  })
})
