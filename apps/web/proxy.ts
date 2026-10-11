import { type NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"

import { getSessionCookie } from "@workspace/auth/next"

import { routing } from "./i18n/routing"
import { getProtectedLocale } from "./lib/protected-routes"

// Redirects unprefixed URLs (e.g. "/") to the best locale, using the
// NEXT_LOCALE cookie first, then the browser's Accept-Language header.
const handleI18nRouting = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  // Optimistic check: only the presence of the session cookie is tested here,
  // the (app) layout validates the session itself.
  const locale = getProtectedLocale(request.nextUrl.pathname, routing.locales)
  if (locale && !getSessionCookie(request)) {
    const signIn = new URL(`/${locale}/sign-in`, request.url)
    const { pathname, search } = request.nextUrl
    signIn.searchParams.set("redirect", `${pathname}${search}`)
    return NextResponse.redirect(signIn)
  }

  return handleI18nRouting(request)
}

export const config = {
  // Every path except API routes, Next.js / Vercel internals and files
  // with an extension (favicon.ico, images...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
