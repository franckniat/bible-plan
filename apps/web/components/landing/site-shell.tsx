import type { ReactNode } from "react"

import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHeader } from "@/components/landing/landing-header"

/**
 * Public pages frame (landing, legal pages): brand palette in light and dark
 * mode, warm light behind the top of the page, header and footer.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-brand-cream text-brand-night [--primary-foreground:var(--brand-cream)] [--primary:var(--brand-night)] [--ring:var(--brand-gold)] dark:bg-brand-night dark:text-brand-cream dark:[--primary-foreground:var(--brand-night)] dark:[--primary:var(--brand-gold)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklab,var(--brand-gold)_30%,transparent),transparent)] dark:bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklab,var(--brand-gold)_18%,transparent),transparent)]"
      />
      <LandingHeader />
      <main className="relative flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
