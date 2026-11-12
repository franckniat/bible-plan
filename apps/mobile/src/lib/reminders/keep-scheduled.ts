import { useEffect } from "react"
import { AppState } from "react-native"

import { onChange } from "@/db/changes"
import { afterFirstScreen } from "@/lib/after-first-screen"
import { followPhoneTimeZone } from "@/repositories/reminders"
import { phoneTimeZone } from "@/repositories/profile"

import { rescheduleReminders } from "./schedule"

/** The tables whose changes change what the reminders say. */
const contentTables = [
  "reminder",
  "readingPlan",
  "planEnrollment",
  "readingProgress",
  "prayerRequest",
]

/**
 * Keeps the reminders scheduled, without any server: when the app opens or
 * comes back (in another time zone, the profile and the reminders follow the
 * phone), and shortly after what they say changes (a reading marked as read,
 * a new prayer request).
 */
export function useReminderScheduling() {
  useEffect(() => {
    const refresh = () => {
      followPhoneTimeZone(phoneTimeZone())
      void rescheduleReminders()
    }
    // The day follows the phone's time zone at once; the notifications are
    // scheduled again once the first screen is shown.
    followPhoneTimeZone(phoneTimeZone())
    const cancel = afterFirstScreen(() => void rescheduleReminders())
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh()
    })
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = onChange((tables) => {
      if (!contentTables.some((table) => tables.has(table))) return
      clearTimeout(timer)
      timer = setTimeout(() => void rescheduleReminders(), 1000)
    })
    return () => {
      cancel()
      app.remove()
      stop()
      clearTimeout(timer)
    }
  }, [])
}
