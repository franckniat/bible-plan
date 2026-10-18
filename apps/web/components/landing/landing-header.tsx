import { getTranslations } from "next-intl/server"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { BrandMark } from "@/components/brand/brand-mark"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Link } from "@/i18n/navigation"

export async function LandingHeader() {
  const t = await getTranslations("Landing.header")

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
      <Link
        href="/"
        aria-label={t("home")}
        className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <BrandMark className="h-8" />
        <span className="font-heading text-xl font-semibold tracking-tight whitespace-nowrap">
          Bible Plan
        </span>
      </Link>
      <div className="flex items-center gap-4">
        {/* On a phone the language is chosen in the footer. */}
        <LanguageSwitcher className="hidden text-sm sm:flex" />
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ variant: "outline" }), "h-9")}
        >
          {t("signIn")}
        </Link>
      </div>
    </header>
  )
}
