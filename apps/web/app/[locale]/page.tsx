import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { prisma } from "@workspace/db"

import { AppPreview } from "@/components/landing/app-preview"
import { ComingSoon } from "@/components/landing/coming-soon"
import { Features } from "@/components/landing/features"
import { Hero } from "@/components/landing/hero"
import { SiteShell } from "@/components/landing/site-shell"
import { StructuredData } from "@/components/landing/structured-data"
import { WaitlistCounter } from "@/components/landing/waitlist-counter"
import { WaitlistSection } from "@/components/landing/waitlist-section"
import { WaitlistForm } from "@/components/waitlist/waitlist-form"
import { routing } from "@/i18n/routing"
import { pageAlternates, pageSocial } from "@/lib/site"
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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Metadata" })
  return {
    alternates: pageAlternates(locale, "/"),
    ...pageSocial(locale, "/", {
      title: t("title"),
      description: t("description"),
    }),
  }
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const waitlistCount = await getWaitlistCount()

  return (
    <SiteShell>
      <StructuredData locale={locale} />
      <Hero />
      <Features />
      <AppPreview />
      <ComingSoon />
      <WaitlistSection
        counter={
          <WaitlistCounter
            count={waitlistCount}
            className="text-brand-cream/85"
          />
        }
      >
        <WaitlistForm className="bg-white dark:bg-neutral-800" />
      </WaitlistSection>
    </SiteShell>
  )
}
