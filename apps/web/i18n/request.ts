import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { loadMessages } from "@workspace/i18n"

import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: await loadMessages(locale),
    // Dates without a user context (e.g. legal pages) are formatted in UTC.
    timeZone: "UTC",
  }
})
