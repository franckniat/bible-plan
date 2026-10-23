import type { Metadata } from "next"
import type { ReactNode } from "react"

import { getLocale } from "next-intl/server"

import { AppShell } from "@/components/app/app-shell"
import { redirect } from "@/i18n/navigation"
import { needsConsent } from "@/server/services/account"
import { requireUser } from "@/server/session"

// Personal pages are not useful in search results.
export const metadata: Metadata = { robots: { index: false } }

/** Signed-in area: every page below requires a valid session. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  // Nothing is stored before the consent to the policy and terms.
  if (needsConsent(user)) {
    return redirect({ href: "/consent", locale: await getLocale() })
  }
  return <AppShell user={user}>{children}</AppShell>
}
