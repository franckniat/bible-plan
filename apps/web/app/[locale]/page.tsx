import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { Hero } from "@/components/landing/hero"
import { LandingHeader } from "@/components/landing/landing-header"
import { routing } from "@/i18n/routing"

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)

  return (
    <div className="relative min-h-svh overflow-x-clip bg-brand-cream text-brand-night [--primary-foreground:var(--brand-cream)] [--primary:var(--brand-night)] [--ring:var(--brand-gold)] dark:bg-brand-night dark:text-brand-cream dark:[--primary-foreground:var(--brand-night)] dark:[--primary:var(--brand-gold)]">
      {/* Warm light rising behind the top of the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklab,var(--brand-gold)_30%,transparent),transparent)] dark:bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklab,var(--brand-gold)_18%,transparent),transparent)]"
      />
      <LandingHeader />
      <main className="relative">
        <Hero />
      </main>
    </div>
  )
}
