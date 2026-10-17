import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { SiteShell } from "@/components/landing/site-shell"
import { Link } from "@/i18n/navigation"

/** The reader for visitors without an account. */
export async function PublicReaderShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("Reader.public")

  return (
    <SiteShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-2 pb-24 md:pb-12">
        <aside className="flex flex-col gap-3 rounded-2xl bg-white/85 p-4 ring-1 ring-brand-night/10 sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900/85 dark:ring-white/10">
          <p className="text-sm text-brand-night/80 dark:text-neutral-100/80">
            {t("invitation")}
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {t("signUp")}
            </Link>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("signIn")}
            </Link>
          </div>
        </aside>
        {children}
      </div>
    </SiteShell>
  )
}
