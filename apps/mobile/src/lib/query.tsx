import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import * as Network from "expo-network"
import type { ReactNode } from "react"
import { AppState, Platform } from "react-native"

import { ApiError } from "@/lib/api"
import { storage } from "@/lib/preferences/storage"

const week = 7 * 24 * 60 * 60 * 1000

/**
 * What is online by nature (groups): TanStack Query, its answers kept on the
 * phone for a week, so that without network the last known state stays on
 * screen (PLAN-MOBILE.md, M17).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: week,
      staleTime: 30_000,
      // A refusal (not a member, signed out) is not tried again.
      retry: (failures, error) =>
        failures < 2 &&
        !(
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ),
    },
  },
})

const persister = createAsyncStoragePersister({
  key: "query-cache",
  storage: {
    getItem: async (key) => storage.get(key) || null,
    setItem: async (key, value) => storage.set(key, value),
    // The storage has no removal: an empty value reads as nothing.
    removeItem: async (key) => storage.set(key, ""),
  },
})

if (Platform.OS !== "web") {
  // Back online or in the foreground: what is stale is fetched again.
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) =>
      setOnline(state.isConnected !== false)
    )
    return () => subscription.remove()
  })
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state) =>
      setFocused(state === "active")
    )
    return () => subscription.remove()
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: week, buster: "1" }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
