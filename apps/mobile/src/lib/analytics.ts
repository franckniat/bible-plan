import PostHog from "posthog-react-native"

import { getPreferences, setPreferences } from "@/lib/preferences"

/**
 * Anonymous usage statistics (PostHog, EU), only once the person agreed
 * (onboarding, Settings › My data): never their name, address, or anything
 * they wrote (prayers, notes, plan titles). Events are a closed list with
 * plain values; without EXPO_PUBLIC_POSTHOG_KEY nothing is ever sent.
 */

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"

/** What can be counted, and the only properties each one carries. */
export type AnalyticsEvent =
  | { name: "plan_created"; source: string; template: string | null }
  | { name: "reading_marked" }
  | { name: "prayer_added" }
  | { name: "prayer_answered" }
  | { name: "session_finished"; kind: string; minutes: number }
  | { name: "note_saved" }
  | { name: "reminder_saved"; kind: string }
  | { name: "achievement_earned"; key: string; level: number }
  | { name: "backup_exported" }
  | { name: "backup_imported"; count: number }

let client: PostHog | null = null

/** The PostHog client, made once the person agreed and a key is set. */
function posthog(): PostHog | null {
  if (!apiKey || !getPreferences().analytics) return null
  client ??= new PostHog(apiKey, {
    host,
    // No location from the address, no person profile: counts only.
    disableGeoip: true,
    personProfiles: "never",
    captureAppLifecycleEvents: true,
  })
  return client
}

/** Whether statistics can be sent at all (a key is set for this build). */
export const analyticsAvailable = Boolean(apiKey)

/** The person's choice: on starts counting, off stops and forgets the id. */
export function setAnalytics(enabled: boolean) {
  setPreferences({ analytics: enabled })
  if (enabled) {
    posthog()?.optIn()
  } else if (client) {
    void client.optOut()
    client.reset()
  }
}

/** Counts an event, if the person agreed. */
export function track({ name, ...properties }: AnalyticsEvent) {
  posthog()?.capture(name, properties)
}

/** Counts a screen by its route ("/plan/[id]"), never its parameters. */
export function trackScreen(route: string) {
  void posthog()?.screen(route)
}

/** Reports an error (its message and stack, no data of the person). */
export function reportError(error: unknown, context: string) {
  posthog()?.captureException(error, { context })
}
