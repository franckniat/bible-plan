"use client"

import { useEffect } from "react"

import { detectTimeZoneAction } from "@/server/actions/profile"

/**
 * Saves the browser's time zone for a user who has none yet (first sign-in),
 * so reminders and "today" follow their local time. Renders nothing.
 */
export function TimeZoneDetector() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone) {
      detectTimeZoneAction(timezone).catch((error: unknown) => {
        console.error("Time zone detection failed", error)
      })
    }
  }, [])

  return null
}
