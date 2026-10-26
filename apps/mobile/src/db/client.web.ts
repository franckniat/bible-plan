import { drizzle } from "drizzle-orm/sql-js"
import { Asset } from "expo-asset"
import initSqlJs from "sql.js"

import * as schema from "./schema"
import type { Database } from "./types"

/**
 * The browser preview keeps the database in memory with sql.js: expo-sqlite
 * on the web needs SharedArrayBuffer, which the preview cannot offer. The
 * schema and migrations are the same; the data is lost on reload.
 */

let db: Database | null = null

export async function openDatabase(): Promise<Database> {
  if (db) return db
  const wasm = await Asset.fromModule(
    require("sql.js/dist/sql-wasm.wasm")
  ).downloadAsync()
  const SQL = await initSqlJs({ locateFile: () => wasm.uri })
  db = drizzle(new SQL.Database(), { schema })
  return db
}

export function getDatabase(): Database {
  if (!db) throw new Error("The database is not open yet")
  return db
}
