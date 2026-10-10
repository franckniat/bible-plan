import createMiddleware from "next-intl/middleware"

import { routing } from "./i18n/routing"

// Redirects unprefixed URLs (e.g. "/") to the best locale, using the
// NEXT_LOCALE cookie first, then the browser's Accept-Language header.
export default createMiddleware(routing)

export const config = {
  // Every path except API routes, Next.js / Vercel internals and files
  // with an extension (favicon.ico, images...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
