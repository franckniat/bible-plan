import { router } from "expo-router"

import { setPreferences } from "@/lib/preferences"

/** Shows a passage at the root of the Bible tab, closing what is above. */
export function openPassage(slug: string) {
  setPreferences({ lastPassage: slug })
  router.dismissTo("/bible")
}
