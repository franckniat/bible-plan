import { describe, expect, it } from "vitest"

import {
  areEmailRemindersEnabled,
  DEFAULT_DAILY_LIMIT,
  DEFAULT_FROM,
  getEmailDailyLimit,
  getEmailDriver,
  getEmailFrom,
  isEmailEnabled,
} from "./config"

describe("getEmailDriver", () => {
  it("uses Resend as soon as a key is set", () => {
    expect(getEmailDriver({ RESEND_API_KEY: "re_123" })).toBe("resend")
    expect(
      getEmailDriver({ RESEND_API_KEY: "re_123", NODE_ENV: "production" })
    ).toBe("resend")
  })

  it("prints emails in development and drops them in production", () => {
    expect(getEmailDriver({ NODE_ENV: "development" })).toBe("console")
    expect(getEmailDriver({})).toBe("console")
    expect(getEmailDriver({ NODE_ENV: "production" })).toBe("noop")
  })

  it("can be forced, ignoring unknown values", () => {
    expect(
      getEmailDriver({ RESEND_API_KEY: "re_1", EMAIL_DRIVER: "console" })
    ).toBe("console")
    expect(getEmailDriver({ EMAIL_DRIVER: "smtp" })).toBe("console")
  })
})

describe("isEmailEnabled / areEmailRemindersEnabled", () => {
  it("only counts Resend as enabled", () => {
    expect(isEmailEnabled({ RESEND_API_KEY: "re_123" })).toBe(true)
    expect(isEmailEnabled({})).toBe(false)
  })

  it("keeps reminder emails off by default", () => {
    expect(areEmailRemindersEnabled({ RESEND_API_KEY: "re_123" })).toBe(false)
    expect(areEmailRemindersEnabled({ EMAIL_REMINDERS_ENABLED: "true" })).toBe(
      false
    )
    expect(
      areEmailRemindersEnabled({
        RESEND_API_KEY: "re_123",
        EMAIL_REMINDERS_ENABLED: "true",
      })
    ).toBe(true)
  })
})

describe("defaults", () => {
  it("falls back to Resend's test sender and the free daily limit", () => {
    expect(getEmailFrom({})).toBe(DEFAULT_FROM)
    expect(getEmailFrom({ EMAIL_FROM: "BP <a@b.co>" })).toBe("BP <a@b.co>")
    expect(getEmailDailyLimit({})).toBe(DEFAULT_DAILY_LIMIT)
    expect(getEmailDailyLimit({ EMAIL_DAILY_LIMIT: "3000" })).toBe(3000)
    expect(getEmailDailyLimit({ EMAIL_DAILY_LIMIT: "-1" })).toBe(
      DEFAULT_DAILY_LIMIT
    )
  })
})
