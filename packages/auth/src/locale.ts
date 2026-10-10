import { defaultLocale, localeSchema, type Locale } from "@workspace/core"

/**
 * Language of an auth request, used for its emails: the NEXT_LOCALE cookie
 * (set by the language switcher), then the browser's Accept-Language header.
 */
export function getRequestLocale(request?: Request): Locale {
  const headers = request?.headers
  if (!headers) return defaultLocale

  const cookie = headers.get("cookie")?.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)
  const fromCookie = localeSchema.safeParse(cookie?.[1])
  if (fromCookie.success) return fromCookie.data

  for (const part of headers.get("accept-language")?.split(",") ?? []) {
    const language = part.split(";")[0]?.trim().slice(0, 2).toLowerCase()
    const parsed = localeSchema.safeParse(language)
    if (parsed.success) return parsed.data
  }
  return defaultLocale
}
