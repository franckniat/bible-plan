import { ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import { planTemplates, type Locale } from "@workspace/core"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/plans/templates">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Templates" })
  return { title: `${t("title")} · Bible Plan` }
}

/** Every plan template, ready to adopt. */
export default async function TemplatesPage() {
  await requireUser()
  const t = await getTranslations("Templates")
  const locale = (await getLocale()) as Locale

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {planTemplates.map((template) => (
          <li
            key={template.key}
            className="flex flex-col gap-4 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
          >
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-lg font-semibold">
                {template.title[locale]}
              </h2>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-brand-night/70 dark:text-neutral-100/70">
                <span>{t("days", { days: template.days })}</span>
                <span>
                  {t("readingsPerDay", { count: template.tracks.length })}
                </span>
              </p>
              <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
                {template.description[locale]}
              </p>
            </div>
            <Link
              href={{
                pathname: "/plans/new",
                query: { template: template.key },
              }}
              aria-label={t("chooseLabel", { title: template.title[locale] })}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-auto h-10 self-start"
              )}
            >
              {t("choose")}
              <ArrowRight />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
