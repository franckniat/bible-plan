"use client"

import { useLocale, useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

import { Link, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

/** Links to the current page in every supported locale. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher")
  const currentLocale = useLocale()
  const pathname = usePathname()

  return (
    <nav aria-label={t("label")} className={cn("flex gap-3", className)}>
      {routing.locales.map((locale) => {
        const isCurrent = locale === currentLocale
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "underline-offset-4 hover:underline",
              isCurrent ? "font-medium" : "text-muted-foreground"
            )}
          >
            {t("locale", { locale })}
          </Link>
        )
      })}
    </nav>
  )
}
