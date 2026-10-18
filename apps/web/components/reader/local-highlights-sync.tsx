"use client"

import { useEffect } from "react"

import { useRouter } from "@/i18n/navigation"
import { toSavedHighlights } from "@/lib/highlights"
import {
  deviceHighlightsKey,
  parseDeviceHighlights,
} from "@/components/reader/use-highlights"
import { importHighlightsAction } from "@/server/actions/highlights"

/**
 * Takes the highlights made on this device before signing in into the
 * account, once, then forgets them on the device. What the account already
 * has is kept as it is. Renders nothing.
 */
export function LocalHighlightsSync() {
  const router = useRouter()

  useEffect(() => {
    const raw = (() => {
      try {
        return localStorage.getItem(deviceHighlightsKey) ?? ""
      } catch {
        return ""
      }
    })()
    const entries = toSavedHighlights(parseDeviceHighlights(raw))
    if (entries.length === 0) return

    void importHighlightsAction(entries)
      .then(() => {
        // Sent (or refused as invalid): either way the device is done with them.
        try {
          localStorage.removeItem(deviceHighlightsKey)
        } catch {
          // Nothing to do.
        }
        router.refresh()
      })
      .catch(() => undefined) // Offline: tried again at the next page.
  }, [router])

  return null
}
