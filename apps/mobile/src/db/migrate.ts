import { useEffect, useState } from "react"

import { ensureProfile } from "@/repositories/profile"

import migrations from "../../drizzle/migrations"
import { applyMigrations } from "./apply-migrations"
import { openDatabase } from "./client"

/**
 * Opens the local database, brings it up to date and makes sure the local
 * profile exists, at startup.
 */
export function useDatabase(): { ready: boolean; error: Error | undefined } {
  const [state, setState] = useState<{ ready: boolean; error?: Error }>({
    ready: false,
  })
  useEffect(() => {
    openDatabase()
      .then(async (db) => {
        await applyMigrations(db, migrations)
        // The person on this phone, created on the first launch.
        ensureProfile(db)
      })
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
