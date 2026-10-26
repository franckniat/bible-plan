import { useEffect, useMemo, useState } from "react"

/**
 * Which tables changed, told by the repositories after each write so that the
 * screens reading them refresh. Works the same with expo-sqlite and sql.js
 * (the browser preview), unlike SQLite's own change hook.
 */
const listeners = new Set<(tables: ReadonlySet<string>) => void>()

export function notifyChange(...tables: string[]) {
  const changed = new Set(tables)
  for (const listener of listeners) listener(changed)
}

export function onChange(listener: (tables: ReadonlySet<string>) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Reads local data (synchronously: SQLite on the phone is fast) and reads it
 * again whenever one of `tables` changes, or `deps`. For repositories: screens
 * use the hooks the repositories give.
 */
export function useLocalQuery<T>(
  tables: readonly string[],
  read: () => T,
  deps: readonly unknown[] = []
): T {
  const [version, setVersion] = useState(0)
  const key = tables.join(",")
  useEffect(
    () =>
      onChange((changed) => {
        if (key.split(",").some((table) => changed.has(table))) {
          setVersion((current) => current + 1)
        }
      }),
    [key]
  )
  // `read` changes at every render; the data it reads changes with `deps`
  // (plain values: ids, dates…) and the tables' version.
  const depsKey = JSON.stringify(deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [version, key, depsKey])
}
