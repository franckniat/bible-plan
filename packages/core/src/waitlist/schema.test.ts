import { describe, expect, it } from "vitest"

import { waitlistSignupSchema } from "./schema"

const valid = {
  email: "  Marie@Example.COM ",
  firstName: " Marie ",
  country: "CM",
  interests: ["plans", "prayer", "plans"],
  locale: "fr",
  consent: true,
}

describe("waitlistSignupSchema", () => {
  it("normalizes a complete signup", () => {
    expect(waitlistSignupSchema.parse(valid)).toEqual({
      email: "marie@example.com",
      firstName: "Marie",
      country: "CM",
      interests: ["plans", "prayer"],
      locale: "fr",
      consent: true,
    })
  })

  it("only requires the email, the locale and the consent", () => {
    expect(
      waitlistSignupSchema.parse({
        email: "a@b.co",
        firstName: "",
        country: "",
        locale: "en",
        consent: true,
      })
    ).toEqual({ email: "a@b.co", interests: [], locale: "en", consent: true })
  })

  it("reports the failing fields", () => {
    const result = waitlistSignupSchema.safeParse({
      ...valid,
      email: "not-an-email",
      country: "XX",
      interests: ["bitcoin"],
      consent: false,
    })
    expect(result.success).toBe(false)
    const fields = result.error?.issues.map((issue) => issue.path[0])
    expect(fields).toEqual(
      expect.arrayContaining(["email", "country", "interests", "consent"])
    )
    const email = result.error?.issues.find((i) => i.path[0] === "email")
    expect(email?.message).toBe("invalid_email")
  })

  it("rejects a first name longer than 60 characters", () => {
    const result = waitlistSignupSchema.safeParse({
      ...valid,
      firstName: "x".repeat(61),
    })
    expect(result.success).toBe(false)
  })
})
