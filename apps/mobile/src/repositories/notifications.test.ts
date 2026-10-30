import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { listRung, logScheduled, markRead, unreadCount } from "./notifications"

vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

const entry = (id: string, at: string) => ({
  id,
  kind: "READING" as const,
  title: "C’est l’heure de lire",
  body: "Votre lecture du jour vous attend.",
  href: "/today",
  at,
})

describe("notification centre", () => {
  it("lists the reminders rung, and replaces those to come when scheduling again", async () => {
    const db = await testDatabase()
    logScheduled(
      db,
      [
        entry("a", "2026-10-30T06:00:00.000Z"),
        entry("b", "2026-10-31T06:00:00.000Z"),
      ],
      new Date("2026-10-29T20:00:00.000Z")
    )
    const later = new Date("2026-10-30T09:00:00.000Z")
    expect(listRung(db, later).map((item) => item.id)).toEqual(["a"])
    expect(unreadCount(db, later)).toBe(1)

    // Scheduled again: "b" (to come) is replaced, "a" (rung) is kept.
    logScheduled(db, [entry("c", "2026-10-31T06:00:00.000Z")], later)
    const after = new Date("2026-10-31T07:00:00.000Z")
    expect(listRung(db, after).map((item) => item.id)).toEqual(["c", "a"])

    markRead(db, after)
    expect(unreadCount(db, after)).toBe(0)
  })
})
