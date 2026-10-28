import { sql } from "drizzle-orm"
import { describe, expect, it } from "vitest"

import { applyMigrations } from "./apply-migrations"
import * as schema from "./schema"
import { emptyDatabase, migrationBundle, testDatabase } from "./test-database"
import type { Database } from "./types"

/** The app's tables, without SQLite's and Drizzle's own. */
const tables = (db: Database) =>
  db
    .all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    )
    .map(({ name }) => name)
    .filter((name) => !name.startsWith("__") && name !== "sqlite_sequence")

const appTables = [
  "highlights",
  "outbox",
  "plan_days",
  "plan_enrollments",
  "plan_readings",
  "profile",
  "reading_plans",
  "reading_progress",
]

describe("local database migrations", () => {
  it("creates every table of the schema on a new phone", async () => {
    expect(tables(await testDatabase())).toEqual(appTables)
  })

  it("brings every older database up to date without losing data", async () => {
    const count = migrationBundle().journal.entries.length
    for (let from = 1; from <= count; from++) {
      // A phone that had the app with the first `from` migrations.
      const db = await emptyDatabase()
      await applyMigrations(db, migrationBundle(from))
      db.insert(schema.profile)
        .values({
          id: "local",
          deviceId: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
          timeZone: "Africa/Douala",
          createdAt: "2026-10-27T08:00:00.000Z",
          updatedAt: "2026-10-27T08:00:00.000Z",
        })
        .run()

      await applyMigrations(db, migrationBundle())

      expect(db.select().from(schema.profile).all()).toHaveLength(1)
    }
  })

  it("changes nothing when the app starts again", async () => {
    const db = await testDatabase()
    await applyMigrations(db, migrationBundle())
    expect(tables(db)).toEqual(appTables)
  })
})
