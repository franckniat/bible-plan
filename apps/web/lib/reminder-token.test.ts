import { describe, expect, it } from "vitest"

import {
  reminderUnsubscribeUrl,
  signReminderToken,
  unsubscribeHeaders,
  verifyReminderToken,
} from "./reminder-token"

const secret = "a-long-enough-secret-for-the-tests"

describe("reminder tokens", () => {
  it("gives back the reminder of a token it signed", () => {
    const token = signReminderToken("0197-abc", secret)
    expect(verifyReminderToken(token, secret)).toBe("0197-abc")
  })

  it("refuses a token signed with another secret", () => {
    const token = signReminderToken("r1", "another-secret")
    expect(verifyReminderToken(token, secret)).toBeNull()
  })

  it("refuses a token for another reminder", () => {
    const [, signature] = signReminderToken("r1", secret).split(".")
    expect(verifyReminderToken(`r2.${signature}`, secret)).toBeNull()
  })

  it.each(["", "r1", "r1.", ".abc", "r1.not-a-signature", "r1.AAAA"])(
    "refuses the malformed token %j",
    (token) => {
      expect(verifyReminderToken(token, secret)).toBeNull()
    }
  )
})

describe("reminderUnsubscribeUrl", () => {
  it("points to the unsubscribe route with a token that checks out", () => {
    const url = new URL(
      reminderUnsubscribeUrl("r1", {
        baseUrl: "https://bibleplan.example/",
        secret,
      })
    )
    expect(url.origin + url.pathname).toBe(
      "https://bibleplan.example/api/reminders/unsubscribe"
    )
    expect(verifyReminderToken(url.searchParams.get("token")!, secret)).toBe(
      "r1"
    )
  })
})

describe("unsubscribeHeaders", () => {
  it("offers the link and the one-click post", () => {
    expect(unsubscribeHeaders("https://x.example/u?token=t")).toEqual({
      "List-Unsubscribe": "<https://x.example/u?token=t>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    })
  })
})
