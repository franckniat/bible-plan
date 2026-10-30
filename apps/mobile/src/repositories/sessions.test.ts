import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { saveSession } from "./sessions"
import { readOutbox } from "./write"

vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))
vi.mock("@/lib/ids", () => ({ newId: () => "unused" }))

const now = new Date("2026-10-30T08:20:00.000Z")
const id = () => "019a3a5e-1f00-7000-8000-000000000001"

describe("saveSession", () => {
  it("stores the time really spent and puts it in the outbox", async () => {
    const db = await testDatabase()
    saveSession(
      db,
      {
        kind: "PRAYER",
        plannedSeconds: 1800,
        durationSeconds: 1200,
        startedAt: "2026-10-30T08:00:00.000Z",
      },
      { now, id }
    )
    expect(readOutbox(db)).toMatchObject([
      {
        table: "meditationSession",
        op: "upsert",
        data: { kind: "PRAYER", durationSeconds: 1200, passage: null },
      },
    ])
  })

  it("refuses a duration far over the plan", async () => {
    const db = await testDatabase()
    expect(() =>
      saveSession(
        db,
        {
          plannedSeconds: 300,
          durationSeconds: 900,
          startedAt: "2026-10-30T08:00:00.000Z",
        },
        { now, id }
      )
    ).toThrow()
  })
})
