import { defaultLocale, localeSchema, type Locale } from "@workspace/core"
import { getLocales } from "expo-localization"

/** The first of the phone's preferred languages that the app speaks. */
export function phoneLocale(): Locale {
  for (const { languageCode } of getLocales()) {
    const locale = localeSchema.safeParse(languageCode)
    if (locale.success) return locale.data
  }
  return defaultLocale
}
