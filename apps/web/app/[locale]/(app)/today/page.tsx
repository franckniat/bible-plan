import { Library, Plus } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { getToday, type Locale } from "@workspace/core"
import { prisma } from "@workspace/db"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { toChecklist } from "@/components/plans/checklist"
import { ReadingChecklist } from "@/components/plans/reading-checklist"
import { Link } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import { getTodayPlans, type TodayPlan } from "@/server/services/plans"
import { requireUser } from "@/server/session"

async function TodayPlanCard({ plan }: { plan: TodayPlan }) {
  const t = await getTranslations("App.today")
  const locale = (await getLocale()) as Locale
  const { day } = plan
  const done =
    day !== null && day.readings.every((reading) => reading.completedAt)

  return (
    <li className="flex flex-col gap-4 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-lg font-semibold">{plan.title}</h2>
        <p className="text-xs text-brand-night/60 dark:text-neutral-100/60">
          {t("progress", {
            completed: plan.completedReadings,
            total: plan.totalReadings,
          })}
        </p>
      </div>

      {day === null ? (
        <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
          {t("finished")}
        </p>
      ) : (
        <>
          {!plan.isToday && (
            <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
              {t("next", {
                date: formatIsoDate(day.date, locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }),
              })}
            </p>
          )}
          <ReadingChecklist
            readings={toChecklist(day, plan.trackNames, locale)}
          />
          {plan.isToday && done && (
            <p
              role="status"
              className="rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm"
            >
              {t("done")}
            </p>
          )}
        </>
      )}
    </li>
  )
}

/** Home of the signed-in area: the readings of the day, all plans together. */
export default async function TodayPage() {
  const user = await requireUser()
  const t = await getTranslations("App.today")
  const locale = await getLocale()
  // "Today" is the user's day, not the server's.
  const today = getToday(user.timezone)
  const plans = await getTodayPlans(prisma, user.id, today)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">
          {t("greeting", { name: user.name })}
        </h1>
        <p className="text-brand-night/70 first-letter:uppercase dark:text-neutral-100/70">
          {formatIsoDate(today, locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

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
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plans/new"
              className={cn(buttonVariants({ size: "lg" }), "h-11 sm:px-5")}
            >
              <Plus />
              {t("empty.create")}
            </Link>
            <Link
              href="/plans/templates"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-11 sm:px-5"
              )}
            >
              <Library />
              {t("empty.templates")}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {plans.map((plan) => (
            <TodayPlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      )}
    </div>
  )
}
