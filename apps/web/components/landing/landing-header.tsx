import { getTranslations } from "next-intl/server"

import { BrandMark } from "@/components/brand/brand-mark"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Link } from "@/i18n/navigation"

export async function LandingHeader() {
  const t = await getTranslations("Landing.header")

  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link
        href="/"
        aria-label={t("home")}
        className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <BrandMark className="h-8" />
        <span className="font-heading text-xl font-semibold tracking-tight">
          Bible Plan
        </span>
      </Link>
      <LanguageSwitcher className="text-sm" />
    </header>
  )
}
