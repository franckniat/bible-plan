import { migrate } from "drizzle-orm/expo-sqlite/migrator"
import { useEffect, useState } from "react"

import migrations from "../../drizzle/migrations"
import { openDatabase } from "./client"
import type { Database } from "./types"

/** The bundled migrations: drizzle-kit's journal and SQL files. */
export type Migrations = typeof migrations

/**
 * Applies the migrations the database does not have yet, in order; data is
 * kept. Drizzle's migrator only needs a SQLite dialect and session, so the
 * same code runs on the phone, in the browser preview and in tests.
 */
export async function migrateDatabase(
  db: Database,
  bundle: Migrations = migrations
): Promise<void> {
  await migrate(db as never, bundle)
}

/** Opens the local database and brings it up to date at startup. */
export function useDatabase(): { ready: boolean; error: Error | undefined } {
  const [state, setState] = useState<{ ready: boolean; error?: Error }>({
    ready: false,
  })
  useEffect(() => {
    openDatabase()
      .then(migrateDatabase)
      .then(() => setState({ ready: true }))
      .catch((error: unknown) =>
        setState({
          ready: false,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      )
  }, [])
  return { ready: state.ready, error: state.error }
}
