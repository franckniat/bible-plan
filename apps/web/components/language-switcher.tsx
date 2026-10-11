"use client"

import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Suspense } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { Link, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

type SwitcherProps = { className?: string }

/** Links to the current page in every supported locale. */
export function LanguageSwitcher(props: SwitcherProps) {
  // Static pages render without the query string; the browser then fills it in.
  return (
    <Suspense fallback={<LocaleLinks {...props} query="" />}>
      <LanguageSwitcherWithQuery {...props} />
    </Suspense>
  )
}

/** Keeps the query string (e.g. a password reset token) when switching. */
function LanguageSwitcherWithQuery(props: SwitcherProps) {
  const query = useSearchParams().toString()
  return <LocaleLinks {...props} query={query} />
}

function LocaleLinks({ className, query }: SwitcherProps & { query: string }) {
  const t = useTranslations("LanguageSwitcher")
  const currentLocale = useLocale()
  const pathname = usePathname()
  const href = query ? `${pathname}?${query}` : pathname

  return (
    <nav aria-label={t("label")} className={cn("flex gap-3", className)}>
      {routing.locales.map((locale) => {
        const isCurrent = locale === currentLocale
        return (
          <Link
            key={locale}
            href={href}
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
