import "server-only"

import { headers } from "next/headers"
import { getLocale } from "next-intl/server"
import { cache } from "react"

import { redirect } from "@/i18n/navigation"
import { auth } from "@/server/auth"

/** Current session (user + session), or null. Deduplicated per request. */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>["user"]

/**
 * The signed-in user, or a redirect to the sign-in page. Use it in every
 * Server Component, Server Action and Route Handler that needs a user: the
 * proxy only performs an optimistic cookie check.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    return redirect({ href: "/sign-in", locale: await getLocale() })
  }
  return session.user
}
