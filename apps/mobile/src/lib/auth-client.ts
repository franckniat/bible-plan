import { expoClient } from "@better-auth/expo/client"
import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import * as SecureStore from "expo-secure-store"

import { siteUrl } from "@/lib/site"

/**
 * The account on the website's server (better-auth): optional, it only
 * saves and syncs the data (PLAN-MOBILE.md). The session is kept in the
 * phone's keychain (expo-secure-store); the browser comes back to the app
 * by its bibleplan:// scheme.
 */
export const authClient = createAuthClient({
  baseURL: siteUrl,
  plugins: [
    expoClient({
      scheme: "bibleplan",
      storagePrefix: "bibleplan",
      storage: SecureStore,
    }),
    magicLinkClient(),
  ],
})

export const { useSession } = authClient
