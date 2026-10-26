import { migrate } from "drizzle-orm/expo-sqlite/migrator"

import type { Database } from "./types"

/** Migrations as drizzle-kit bundles them: a journal and the SQL of each. */
export type MigrationBundle = {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[]
  }
  migrations: Record<string, string>
}

/**
 * Applies the migrations the database does not have yet, in order; data is
 * kept. Drizzle's migrator only needs a SQLite dialect and session, so the
 * same code runs on the phone, in the browser preview and in tests.
 */
export async function applyMigrations(
  db: Database,
  bundle: MigrationBundle
): Promise<void> {
  await migrate(db as never, bundle)
}
