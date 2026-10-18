import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { SiteShell } from "@/components/landing/site-shell"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/unsubscribed">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Unsubscribed" })
  // A page reached from an email: nothing to index.
  return { title: `${t("title")} · Bible Plan`, robots: { index: false } }
}

/** Where the unsubscribe link of a reminder email lands. */
export default async function UnsubscribedPage({
  params,
}: PageProps<"/[locale]/unsubscribed">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations("Unsubscribed")

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 pt-8 pb-24">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-lg text-brand-night/75 dark:text-neutral-100/75">
          {t("description")}
        </p>
        <Link
          href="/settings/reminders"
          className={cn(buttonVariants({ size: "lg" }), "h-11 sm:px-5")}
        >
          {t("manage")}
        </Link>
      </div>
    </SiteShell>
  )
}
