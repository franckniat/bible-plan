import { createTranslator } from "use-intl"

import type { Locale } from "@workspace/core"
import { loadMessages } from "@workspace/i18n"

/** Translator for email texts ("Emails" namespace of @workspace/i18n). */
export async function getEmailTranslator(locale: Locale) {
  const messages = await loadMessages(locale)
  return createTranslator({ locale, messages, namespace: "Emails" })
}

export type EmailTranslator = Awaited<ReturnType<typeof getEmailTranslator>>
