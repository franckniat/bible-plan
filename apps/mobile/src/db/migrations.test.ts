/// <reference types="node" />

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/sql-js"
import initSqlJs from "sql.js"
import { describe, expect, it } from "vitest"

import { applyMigrations, type MigrationBundle } from "./apply-migrations"
import * as schema from "./schema"
import type { Database } from "./types"

const folder = join(__dirname, "../../drizzle")

/** The bundle the app ships, read from drizzle/ (Babel inlines it in the app). */
function bundle(): MigrationBundle {
  const journal = JSON.parse(
    readFileSync(join(folder, "meta/_journal.json"), "utf8")
  ) as MigrationBundle["journal"]
  const migrations = Object.fromEntries(
    journal.entries.map((entry) => [
      `m${entry.idx.toString().padStart(4, "0")}`,
      readFileSync(join(folder, `${entry.tag}.sql`), "utf8"),
    ])
  )
  return { journal, migrations }
}

/** The bundle of an older app: its first `count` migrations. */
function firstMigrations(count: number): MigrationBundle {
  const all = bundle()
  return { ...all, journal: { entries: all.journal.entries.slice(0, count) } }
}

async function emptyDatabase(): Promise<Database> {
  const SQL = await initSqlJs()
  return drizzle(new SQL.Database(), { schema })
}

/** The app's tables, without SQLite's and Drizzle's own. */
const tables = (db: Database) =>
  db
    .all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    )
    .map(({ name }) => name)
    .filter((name) => !name.startsWith("__") && name !== "sqlite_sequence")

describe("local database migrations", () => {
  it("creates every table of the schema on a new phone", async () => {
    const db = await emptyDatabase()
    await applyMigrations(db, bundle())
    expect(tables(db)).toEqual(["outbox", "profile"])
  })

  it("brings every older database up to date without losing data", async () => {
    const count = bundle().journal.entries.length
    for (let from = 1; from <= count; from++) {
      // A phone that had the app with the first `from` migrations.
      const db = await emptyDatabase()
      await applyMigrations(db, firstMigrations(from))
      db.insert(schema.profile)
        .values({
          id: "local",
          deviceId: "0199f3a2-7c41-7b2e-9f10-3c5d8e6a4b21",
          timeZone: "Africa/Douala",
          createdAt: "2026-10-27T08:00:00.000Z",
          updatedAt: "2026-10-27T08:00:00.000Z",
        })
        .run()

      await applyMigrations(db, bundle())

      expect(db.select().from(schema.profile).all()).toHaveLength(1)
    }
  })

  it("changes nothing when the app starts again", async () => {
    const db = await emptyDatabase()
    await applyMigrations(db, bundle())
    await applyMigrations(db, bundle())
    expect(tables(db)).toEqual(["outbox", "profile"])
  })
})
