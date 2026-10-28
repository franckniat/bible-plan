import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { ensureProfile, getProfile, updateProfile } from "./profile"

// The phone's random source is not needed: ids are given.
vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))
vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))
// The preferences are kept by expo-sqlite, which needs the phone.
vi.mock("@/lib/preferences/storage", () => ({
  storage: { get: () => null, set: () => {} },
}))

const deviceId = () => "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21"
const now = new Date("2026-10-27T08:00:00.000Z")

describe("ensureProfile", () => {
  it("creates the profile on the first launch with the choices made", async () => {
    const db = await testDatabase()
    const profile = ensureProfile(db, {
      now,
      timeZone: "Africa/Douala",
      deviceId,
      seed: { locale: "en", readingSpeed: "slow" },
    })
    expect(profile).toEqual({
      id: "local",
      deviceId: deviceId(),
      locale: "en",
      timeZone: "Africa/Douala",
      bibleVersion: null,
      readingSpeed: "slow",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
  })

  it("keeps the profile of a later launch", async () => {
    const db = await testDatabase()
    ensureProfile(db, { now, timeZone: "Africa/Douala", deviceId })
    const again = ensureProfile(db, {
      timeZone: "Europe/Paris",
      deviceId: () => "another",
    })
    expect(again).toMatchObject({
      deviceId: deviceId(),
      timeZone: "Africa/Douala",
    })
  })
})

describe("updateProfile", () => {
  it("changes the settings and the date of change", async () => {
    const db = await testDatabase()
    ensureProfile(db, { now, timeZone: "UTC", deviceId })
    const later = new Date("2026-10-28T08:00:00.000Z")
    updateProfile(db, { bibleVersion: "kjv", locale: null }, later)
    expect(getProfile(db)).toMatchObject({
      bibleVersion: "kjv",
      locale: null,
      updatedAt: later.toISOString(),
    })
  })
})
