import { Plus } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import { prisma } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { formatIsoDate } from "@/lib/dates"
import { listPlans, type PlanSummary } from "@/server/services/plans"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/plans">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Plans" })
  return { title: `${t("title")} · Bible Plan` }
}

async function PlanCard({
  plan,
  highlighted,
}: {
  plan: PlanSummary
  highlighted: boolean
}) {
  const t = await getTranslations("Plans")
  const locale = await getLocale()
  const percent = plan.totalReadings
    ? Math.round((plan.completedReadings / plan.totalReadings) * 100)
    : 0
  const date = (value: string) =>
    formatIsoDate(value, locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10",
        highlighted && "ring-2 ring-brand-gold dark:ring-brand-gold"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">{plan.title}</h2>
        {plan.status === "PAUSED" && (
          <Badge variant="secondary">{t("paused")}</Badge>
        )}
      </div>
      <p className="text-sm text-brand-night/65 dark:text-neutral-100/65">
        {t("dates", { start: date(plan.startDate), end: date(plan.endDate) })}
        {" · "}
        {t("days", { days: plan.totalDays })}
      </p>
      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t("progressLabel", { title: plan.title })}
          className="h-2 overflow-hidden rounded-full bg-brand-night/10 dark:bg-white/10"
        >
          <div
            className="h-full rounded-full bg-brand-gold"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-brand-night/60 dark:text-neutral-100/60">
          {t("progress", {
            completed: plan.completedReadings,
            total: plan.totalReadings,
          })}
        </p>
      </div>
    </li>
  )
}

export default async function PlansPage({
  searchParams,
}: PageProps<"/[locale]/plans">) {
  const user = await requireUser()
  const t = await getTranslations("Plans")
  const plans = await listPlans(prisma, user.id)
  // ?created=<id> comes from the plan wizard.
  const { created } = await searchParams
  const newButton = (
    <Link
      href="/plans/new"
      className={cn(buttonVariants({ size: "lg" }), "h-11 self-start sm:px-5")}
    >
      <Plus />
      {t("new")}
    </Link>
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t("description")}
          </p>
        </div>
        {plans.length > 0 && newButton}
      </div>

      {typeof created === "string" &&
        plans.some((plan) => plan.id === created) && (
          <p
            role="status"
            className="rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm"
          >
            {t("created")}
          </p>
        )}

      {plans.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-xl font-semibold">
              {t("empty.title")}
            </h2>
            <p className="text-brand-night/70 dark:text-neutral-100/70">
              {t("empty.description")}
            </p>
          </div>
          {newButton}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              highlighted={plan.id === created}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
