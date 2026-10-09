import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { prisma } from "@workspace/db"

import { ClosingCall } from "@/components/landing/closing-call"
import { Features } from "@/components/landing/features"
import { Hero } from "@/components/landing/hero"
import { SiteShell } from "@/components/landing/site-shell"
import { WaitlistCounter } from "@/components/landing/waitlist-counter"
import { WaitlistForm } from "@/components/waitlist/waitlist-form"
import { routing } from "@/i18n/routing"
import { countWaitlistEntries } from "@/server/services/waitlist"

// The page is static; the waitlist counter is refreshed at most every 5 minutes
// (and right after a signup, see joinWaitlistAction).
export const revalidate = 300

/** `null` when the database is unreachable (e.g. builds without DATABASE_URL). */
async function getWaitlistCount() {
  try {
    return await countWaitlistEntries(prisma)
  } catch {
    return null
  }
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const waitlistCount = await getWaitlistCount()

  return (
    <SiteShell>
      <Hero counter={<WaitlistCounter count={waitlistCount} />}>
        <WaitlistForm />
      </Hero>
      <Features />
      <ClosingCall />
    </SiteShell>
  )
}
