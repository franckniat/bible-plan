import { useEffect, useState } from "react"

import migrations from "../../drizzle/migrations"
import { applyMigrations } from "./apply-migrations"
import { openDatabase } from "./client"

/** Opens the local database and brings it up to date at startup. */
export function useDatabase(): { ready: boolean; error: Error | undefined } {
  const [state, setState] = useState<{ ready: boolean; error?: Error }>({
    ready: false,
  })
  useEffect(() => {
    openDatabase()
      .then((db) => applyMigrations(db, migrations))
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
