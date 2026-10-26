/// <reference types="node" />
// For tests only: the local database in Node, with sql.js and the migrations
// the app ships (read from drizzle/; Babel inlines them in the app).
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { drizzle } from "drizzle-orm/sql-js"
import initSqlJs from "sql.js"

import { applyMigrations, type MigrationBundle } from "./apply-migrations"
import * as schema from "./schema"
import type { Database } from "./types"

const folder = join(__dirname, "../../drizzle")

/** The bundle of the app, or of an older one with its first `count` migrations. */
export function migrationBundle(count?: number): MigrationBundle {
  const journal = JSON.parse(
    readFileSync(join(folder, "meta/_journal.json"), "utf8")
  ) as MigrationBundle["journal"]
  const entries = journal.entries.slice(0, count)
  const migrations = Object.fromEntries(
    entries.map((entry) => [
      `m${entry.idx.toString().padStart(4, "0")}`,
      readFileSync(join(folder, `${entry.tag}.sql`), "utf8"),
    ])
  )
  return { journal: { entries }, migrations }
}

export async function emptyDatabase(): Promise<Database> {
  const SQL = await initSqlJs()
  return drizzle(new SQL.Database(), { schema })
}

/** A database as a phone has it after a fresh start of the app. */
export async function testDatabase(): Promise<Database> {
  const db = await emptyDatabase()
  await applyMigrations(db, migrationBundle())
  return db
}
