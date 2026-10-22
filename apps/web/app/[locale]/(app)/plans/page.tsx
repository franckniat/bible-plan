import { Library, Plus } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import type { Weekday } from "@workspace/core"
import { prisma } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { SuggestReminder } from "@/components/reminders/suggest-reminder"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { formatIsoDate } from "@/lib/dates"
import { listPlans, type PlanSummary } from "@/server/services/plans"
import { listReminders } from "@/server/services/reminders"
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
  const completed =
    plan.totalReadings > 0 && plan.completedReadings >= plan.totalReadings
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
        <h2 className="font-heading text-lg font-semibold">
          <Link
            href={`/plans/${plan.id}`}
            className="underline-offset-4 hover:underline"
          >
            {plan.title}
          </Link>
        </h2>
        <div className="flex gap-2">
          {plan.group && <Badge variant="outline">{plan.group.name}</Badge>}
          {completed && <Badge>{t("completed")}</Badge>}
          {plan.status !== "ACTIVE" && (
            <Badge variant="secondary">
              {t(plan.status === "PAUSED" ? "paused" : "archived")}
            </Badge>
          )}
        </div>
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
            percent,
          })}
        </p>
      </div>
    </li>
  )
}

/** The days and time zone of a reading reminder for a plan, if one is useful. */
async function getReminderSuggestion(
  userId: string,
  planId: string,
  timeZone?: string | null
) {
  const [reminders, plan] = await Promise.all([
    listReminders(prisma, userId),
    prisma.readingPlan.findFirst({
      where: { id: planId, ownerId: userId },
      select: { activeWeekdays: true },
    }),
  ])
  if (!plan || reminders.some((reminder) => reminder.kind === "READING")) {
    return null
  }
  return {
    weekdays: plan.activeWeekdays as Weekday[],
    timeZone: timeZone ?? "UTC",
  }
}

export default async function PlansPage({
  searchParams,
}: PageProps<"/[locale]/plans">) {
  const user = await requireUser()
  const t = await getTranslations("Plans")
  // ?created=<id> comes from the plan wizard, ?view=archived from the tabs.
  const { created, view } = await searchParams
  const all = await listPlans(prisma, user.id, { includeArchived: true })
  const archivedView = view === "archived"
  // A plan just created: offer a reading reminder, unless there is one.
  const createdId = typeof created === "string" ? created : null
  const suggestion =
    createdId && all.some((plan) => plan.id === createdId)
      ? await getReminderSuggestion(user.id, createdId, user.timezone)
      : null
  const archived = all.filter((plan) => plan.status === "ARCHIVED")
  const current = all.filter((plan) => plan.status !== "ARCHIVED")
  const plans = archivedView ? archived : current
  const actions = (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/plans/new"
        className={cn(buttonVariants({ size: "lg" }), "h-11 sm:px-5")}
      >
        <Plus />
        {t("new")}
      </Link>
      <Link
        href="/plans/templates"
        className={cn(
          buttonVariants({ size: "lg", variant: "outline" }),
          "h-11 sm:px-5"
        )}
      >
        <Library />
        {t("templates")}
      </Link>
    </div>
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
        {current.length > 0 && actions}
      </div>

      {archived.length > 0 && (
        <nav aria-label={t("views.label")} className="flex gap-2">
          {(["current", "archived"] as const).map((value) => {
            const active = (value === "archived") === archivedView
            return (
              <Link
                key={value}
                href={value === "archived" ? "/plans?view=archived" : "/plans"}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-brand-night bg-brand-night text-brand-cream dark:border-brand-gold dark:bg-brand-gold dark:text-neutral-950"
                    : "border-brand-night/15 hover:border-brand-night/40 dark:border-white/15 dark:hover:border-white/40"
                )}
              >
                {t(`views.${value}`, {
                  count:
                    value === "archived" ? archived.length : current.length,
                })}
              </Link>
            )
          })}
        </nav>
      )}

      {typeof created === "string" &&
        plans.some((plan) => plan.id === created) && (
          <p
            role="status"
            className="rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm"
          >
            {t("created")}
          </p>
        )}

      {suggestion && <SuggestReminder {...suggestion} />}

      {archivedView && plans.length === 0 ? (
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("archivedEmpty")}
        </p>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-xl font-semibold">
              {t("empty.title")}
            </h2>
            <p className="text-brand-night/70 dark:text-neutral-100/70">
              {t("empty.description")}
            </p>
          </div>
          {actions}
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
