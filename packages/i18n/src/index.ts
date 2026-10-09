import type { Locale } from "@workspace/core"

import type fr from "../messages/fr.json"

/** Shape of the translation messages; French is the source of truth. */
export type Messages = typeof fr

const loaders: Record<Locale, () => Promise<Messages>> = {
  fr: () => import("../messages/fr.json").then((module) => module.default),
  en: () => import("../messages/en.json").then((module) => module.default),
}

/** Loads the messages of a locale (shared by the web and mobile apps). */
export function loadMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]()
}
