import { drizzle } from "drizzle-orm/expo-sqlite"
import { openDatabaseSync } from "expo-sqlite"

import * as schema from "./schema"
import type { Database } from "./types"

/** The SQLite file of the app, kept across updates. */
export const databaseName = "bible-plan.db"

let db: Database | null = null

/** Opens the database file on the phone (once). */
export async function openDatabase(): Promise<Database> {
  db ??= drizzle(openDatabaseSync(databaseName), { schema })
  return db
}

/** The open database; call openDatabase first (the root layout does). */
export function getDatabase(): Database {
  if (!db) throw new Error("The database is not open yet")
  return db
}
