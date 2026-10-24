/**
 * Sections of the signed-in app, relative to the locale prefix. Visitors
 * without a session cookie are sent to the sign-in page (optimistic check in
 * proxy.ts; the (app) layout verifies the session for real). The Bible
 * reader ("/read") is public, so that verses can be shared.
 */
export const protectedSections = [
  "/today",
  "/plans",
  "/prayer",
  "/meditation",
  "/meditate",
  "/notes",
  "/groups",
  "/join",
  "/stats",
  "/achievements",
  "/notifications",
  "/settings",
  "/consent",
] as const

/** The locale of a protected path (e.g. "/fr/plans/42" → "fr"), or null. */
export function getProtectedLocale(
  pathname: string,
  locales: readonly string[]
): string | null {
  const [, locale = "", ...rest] = pathname.split("/")
  if (!locales.includes(locale)) return null

  const page = `/${rest.join("/")}`
  const isProtected = protectedSections.some(
    (section) => page === section || page.startsWith(`${section}/`)
  )
  return isProtected ? locale : null
}
