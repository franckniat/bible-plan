// Before launch, production runs in "waitlist mode": only the landing page
// and the pages it links to are public, so work in progress on main is never
// exposed. Set WAITLIST_MODE=true to enable it (see apps/web/.env.example).

/** Pages reachable in waitlist mode, relative to the locale prefix. */
const allowedPages = new Set(["", "/privacy", "/terms"])

/** Metadata routes generated per locale (sharing previews). */
const allowedPagePrefixes = ["/opengraph-image", "/twitter-image"]

export function isWaitlistModeEnabled(value = process.env.WAITLIST_MODE) {
  return value === "true"
}

/**
 * Where to send a request in waitlist mode, or `null` to let it through.
 * Paths without a locale prefix are let through: the i18n proxy first
 * redirects them to a prefixed path, which is then checked again.
 */
export function getWaitlistRedirect(
  pathname: string,
  locales: readonly string[]
): string | null {
  const [, firstSegment = "", ...rest] = pathname.split("/")
  if (!locales.includes(firstSegment)) return null

  const page = rest.length ? `/${rest.join("/")}`.replace(/\/+$/, "") : ""
  const isAllowed =
    allowedPages.has(page) ||
    allowedPagePrefixes.some((prefix) => page.startsWith(prefix))

  return isAllowed ? null : `/${firstSegment}`
}
