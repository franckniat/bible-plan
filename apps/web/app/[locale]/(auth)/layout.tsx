import type { Metadata } from "next"
import type { ReactNode } from "react"

import { SiteShell } from "@/components/landing/site-shell"

// Account forms say nothing a search engine should show.
export const metadata: Metadata = { robots: { index: false } }

/** Sign-in, sign-up and password pages: a narrow column in the site frame. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-md px-6 pt-6 pb-20 lg:pt-12">
        {children}
      </div>
    </SiteShell>
  )
}
