import { router } from "expo-router"

import { recordReading } from "@/lib/reading-history"

/** Shows a passage at the root of the Bible tab, closing what is above. */
export function openPassage(slug: string) {
  recordReading(slug)
  router.dismissTo("/bible")
}
