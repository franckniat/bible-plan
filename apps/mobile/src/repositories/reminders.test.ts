import { maxRemindersPerUser } from "@workspace/core"
import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { deleteReminder, listReminders, saveReminder } from "./reminders"
import { readOutbox } from "./write"

vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))
vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))

const now = new Date("2026-10-30T09:00:00.000Z")
let next = 0
const id = () => `019a3a5e-1f00-7000-8000-${String(++next).padStart(12, "0")}`
const input = {
  kind: "READING" as const,
  localTime: "07:30",
  timeZone: "Africa/Douala",
  weekdays: [1, 2, 3, 4, 5],
  channels: ["PUSH" as const],
}

describe("reminders", () => {
  it("stores a reminder with the web's rules and puts it in the outbox", async () => {
    const db = await testDatabase()
    const saved = saveReminder(db, input, null, { now, id })
    expect(saved.ok).toBe(true)
    expect(listReminders(db)).toMatchObject([
      {
        kind: "READING",
        localTime: "07:30",
        timezone: "Africa/Douala",
        channels: ["IN_APP", "PUSH"],
        enabled: true,
        durationMinutes: null,
      },
    ])
    if (saved.ok) deleteReminder(db, saved.id, { now })
    expect(listReminders(db)).toEqual([])
    expect(readOutbox(db).map((change) => change.op)).toEqual([
      "upsert",
      "delete",
    ])
  })

  it("refuses a time off the 5-minute steps, and more than the limit", async () => {
    const db = await testDatabase()
    expect(() =>
      saveReminder(db, { ...input, localTime: "07:32" }, null, { now, id })
    ).toThrow()
    for (let index = 0; index < maxRemindersPerUser; index++) {
      saveReminder(db, input, null, { now, id })
    }
    expect(saveReminder(db, input, null, { now, id })).toEqual({
      ok: false,
      error: "limit",
    })
  })
})
