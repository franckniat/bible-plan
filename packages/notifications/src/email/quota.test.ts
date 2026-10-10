import { describe, expect, it, vi } from "vitest"

import {
  EmailQuotaExceededError,
  getCategoryLimit,
  QuotaGuardedEmailSender,
  type EmailQuotaStore,
} from "./quota"
import type { EmailCategory, EmailSender } from "./sender"

function memoryStore(initial: Record<string, number> = {}) {
  const counts = { ...initial }
  const store: EmailQuotaStore = {
    countSent: async (day) => counts[day] ?? 0,
    recordSent: async (day) => {
      counts[day] = (counts[day] ?? 0) + 1
    },
  }
  return { store, counts }
}

const message = (category: EmailCategory) => ({
  to: "a@b.co",
  subject: "s",
  html: "h",
  text: "t",
  category,
})

const now = () => new Date("2026-10-10T23:30:00Z")

describe("getCategoryLimit", () => {
  it("keeps 20% of the daily limit for authentication emails", () => {
    expect(getCategoryLimit("auth", 100)).toBe(100)
    expect(getCategoryLimit("reminder", 100)).toBe(80)
    expect(getCategoryLimit("reminder", 3)).toBe(2)
  })
})

describe("QuotaGuardedEmailSender", () => {
  it("sends and counts emails under the limit", async () => {
    const inner: EmailSender = { send: vi.fn().mockResolvedValue({ id: "1" }) }
    const { store, counts } = memoryStore()
    const sender = new QuotaGuardedEmailSender(inner, store, 100, now)

    await expect(sender.send(message("reminder"))).resolves.toEqual({ id: "1" })
    expect(counts["2026-10-10"]).toBe(1)
  })

  it("stops reminders at 80% but still sends authentication emails", async () => {
    const inner: EmailSender = { send: vi.fn().mockResolvedValue({}) }
    const { store } = memoryStore({ "2026-10-10": 80 })
    const sender = new QuotaGuardedEmailSender(inner, store, 100, now)

    await expect(sender.send(message("reminder"))).rejects.toBeInstanceOf(
      EmailQuotaExceededError
    )
    await expect(sender.send(message("auth"))).resolves.toEqual({})
    expect(inner.send).toHaveBeenCalledTimes(1)
  })

  it("refuses everything once the daily limit is reached", async () => {
    const inner: EmailSender = { send: vi.fn() }
    const { store } = memoryStore({ "2026-10-10": 100 })
    const sender = new QuotaGuardedEmailSender(inner, store, 100, now)

    await expect(sender.send(message("auth"))).rejects.toThrow(/100\/100/)
    expect(inner.send).not.toHaveBeenCalled()
  })

  it("counts per UTC day and ignores failed sends", async () => {
    const inner: EmailSender = {
      send: vi.fn().mockRejectedValue(new Error("boom")),
    }
    const { store, counts } = memoryStore({ "2026-10-09": 100 })
    const sender = new QuotaGuardedEmailSender(inner, store, 100, now)

    await expect(sender.send(message("auth"))).rejects.toThrow("boom")
    expect(counts["2026-10-10"]).toBeUndefined()
  })
})
