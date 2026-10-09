import { type NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"

import { routing } from "./i18n/routing"
import { getWaitlistRedirect, isWaitlistModeEnabled } from "./lib/waitlist-mode"

// Redirects unprefixed URLs (e.g. "/") to the best locale, using the
// NEXT_LOCALE cookie first, then the browser's Accept-Language header.
const handleI18nRouting = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  if (isWaitlistModeEnabled()) {
    const redirectTo = getWaitlistRedirect(
      request.nextUrl.pathname,
      routing.locales
    )
    if (redirectTo) {
      // Temporary redirect: the pages open when waitlist mode is turned off.
      return NextResponse.redirect(new URL(redirectTo, request.url), 307)
    }
  }

  return handleI18nRouting(request)
}

export const config = {
  // Every path except API routes, Next.js / Vercel internals and files
  // with an extension (favicon.ico, images...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
