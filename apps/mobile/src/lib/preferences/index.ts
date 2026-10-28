import { useSyncExternalStore } from "react"
import { z } from "zod"

import { storage } from "./storage"

const key = "preferences"

/** When the daily reading reminder comes, scheduled with M14's reminders. */
export const reminderTimes = {
  morning: "07:00",
  noon: "12:30",
  evening: "20:00",
} as const

const preferencesSchema = z.object({
  /** The welcome screens and the onboarding are done. */
  onboarded: z.boolean().catch(false),
  reminder: z.enum(["morning", "noon", "evening", "none"]).catch("morning"),
  /** How the reader shows the text, on this phone (as on the web). */
  reader: z
    .object({
      size: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      verseNumbers: z.boolean(),
      layout: z.enum(["flow", "lines"]),
    })
    .catch({ size: 1, verseNumbers: true, layout: "flow" }),
  /**
   * The passages read on this phone, the latest first (reading-history.ts):
   * the Bible tab opens on the first.
   */
  /** The Bible versions downloaded on this phone (bible/downloads.ts). */
  downloaded: z.array(z.string()).catch([]),
  history: z.array(z.object({ slug: z.string(), at: z.number() })).catch([]),
})

export type Preferences = z.infer<typeof preferencesSchema>
export type Reminder = Preferences["reminder"]

function read(): Preferences {
  let stored: unknown = {}
  try {
    stored = JSON.parse(storage.get(key) ?? "{}")
  } catch {
    // Unreadable: start again from the defaults.
  }
  return preferencesSchema.parse(stored ?? {})
}

let current = read()
const listeners = new Set<() => void>()

/** Saves some preferences on the device and updates the screens. */
export function setPreferences(change: Partial<Preferences>) {
  current = { ...current, ...change }
  storage.set(key, JSON.stringify(current))
  for (const listener of listeners) listener()
}

export function getPreferences(): Preferences {
  return current
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getPreferences,
    getPreferences
  )
}
