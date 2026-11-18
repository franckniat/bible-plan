import {
  expoClient,
  getSetCookie,
  storageAdapter,
} from "@better-auth/expo/client"
import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import * as SecureStore from "expo-secure-store"

import { siteUrl } from "@/lib/site"

const storagePrefix = "bibleplan"

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
      storagePrefix,
      storage: SecureStore,
    }),
    magicLinkClient(),
  ],
})

export const { useSession } = authClient

/**
 * Where an email's sign-in link brings the person back, in the app: the
 * server adds the session to it (`?cookie=`), or `?error=` when the link is
 * no longer valid.
 */
export const signInLinkPath = "/settings/sign-in-link"

/**
 * The same keychain entries as the Expo client's (it queues its writes by
 * storage, so both never write at once).
 */
const keychain = storageAdapter(SecureStore)

/**
 * Keeps the session an email's sign-in link brought back (the server's
 * Set-Cookie header), as the Expo client does after Google: a link opened
 * from the mail app does not go through the client.
 */
export async function adoptSession(setCookie: string) {
  const name = `${storagePrefix}_cookie`
  const current = await keychain.getItemAsync(name)
  await keychain.setItemAsync(
    name,
    getSetCookie(setCookie, current ?? undefined)
  )
  authClient.$store.notify("$sessionSignal")
}
