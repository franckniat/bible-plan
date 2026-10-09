import { describe, expect, it, vi } from "vitest"

import type { WaitlistSignup } from "@workspace/core"

import { countSignupsFromIp, joinWaitlist, type WaitlistDb } from "./waitlist"

function fakeDb() {
  const waitlistEntry = { upsert: vi.fn(), count: vi.fn().mockResolvedValue(3) }
  return { db: { waitlistEntry } as unknown as WaitlistDb, waitlistEntry }
}

const signup: WaitlistSignup = {
  email: "marie@example.com",
  firstName: "Marie",
  country: "CM",
  interests: ["plans", "prayer"],
  locale: "fr",
  consent: true,
}

describe("joinWaitlist", () => {
  const now = new Date("2026-10-09T12:00:00Z")

  it("creates the entry with database enums and the consent date", async () => {
    const { db, waitlistEntry } = fakeDb()
    await joinWaitlist(db, signup, { ipHash: "abc", now })

    const { where, create } = waitlistEntry.upsert.mock.calls[0]![0]
    expect(where).toEqual({ email: "marie@example.com" })
    expect(create).toEqual({
      email: "marie@example.com",
      firstName: "Marie",
      countryCode: "CM",
      interests: ["PLANS", "PRAYER"],
      locale: "fr",
      consentedAt: now,
      ipHash: "abc",
    })
  })

  it("keeps earlier details when signing up again without them", async () => {
    const { db, waitlistEntry } = fakeDb()
    await joinWaitlist(
      db,
      {
        email: "marie@example.com",
        interests: [],
        locale: "en",
        consent: true,
      },
      { now }
    )

    const { update } = waitlistEntry.upsert.mock.calls[0]![0]
    expect(update).toEqual({
      firstName: undefined,
      countryCode: undefined,
      interests: undefined,
      locale: "en",
      consentedAt: now,
    })
  })
})

describe("countSignupsFromIp", () => {
  it("counts recent signups from the same hashed IP", async () => {
    const { db, waitlistEntry } = fakeDb()
    const since = new Date("2026-10-09T11:00:00Z")
    await expect(countSignupsFromIp(db, "abc", since)).resolves.toBe(3)
    expect(waitlistEntry.count).toHaveBeenCalledWith({
      where: { ipHash: "abc", createdAt: { gte: since } },
    })
  })
})
