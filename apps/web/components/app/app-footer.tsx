import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { licenseUrl, sourceCodeUrl } from "@/lib/site"

const linkClassName = "underline-offset-4 hover:underline"

/**
 * Footer of the signed-in area. The "Source code" link offers the running
 * code to every user, as the AGPL (section 13) requires.
 */
export async function AppFooter() {
  const t = await getTranslations("App.footer")

  return (
    <footer className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 text-xs text-brand-night/60 md:px-10 md:pb-8 dark:text-neutral-100/60">
      <nav
        aria-label={t("label")}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-brand-night/10 pt-4 dark:border-white/10"
      >
        <a
          href={sourceCodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {t("sourceCode")}
        </a>
        <a
          href={licenseUrl}
          target="_blank"
          rel="noopener noreferrer license"
          className={linkClassName}
        >
          {t("license")}
        </a>
        <Link href="/privacy" className={linkClassName}>
          {t("privacy")}
        </Link>
        <Link href="/terms" className={linkClassName}>
          {t("terms")}
        </Link>
      </nav>
    </footer>
  )
}
