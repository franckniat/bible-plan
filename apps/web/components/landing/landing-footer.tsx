import { getTranslations } from "next-intl/server"

import { BrandMark } from "@/components/brand/brand-mark"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Link } from "@/i18n/navigation"
import { sourceCodeUrl } from "@/lib/site"

export async function LandingFooter() {
  const t = await getTranslations("Landing.footer")

  return (
    <footer className="border-t border-brand-night/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 font-heading text-base font-semibold">
            <BrandMark className="h-5" />
            Bible Plan
          </span>
          <span className="text-brand-night/60 dark:text-brand-cream/60">
            © {new Date().getFullYear()} · {t("license")}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            {t("privacy")}
          </Link>
          <a
            href={sourceCodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {t("sourceCode")}
          </a>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  )
}
