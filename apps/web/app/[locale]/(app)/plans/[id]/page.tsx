import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { cache } from "react"

import { getToday, type Locale } from "@workspace/core"
import { prisma } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { toChecklist } from "@/components/plans/checklist"
import { PlanActions } from "@/components/plans/plan-actions"
import { ReadingChecklist } from "@/components/plans/reading-checklist"
import { Link } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import { getPlan, type PlanDetailDay } from "@/server/services/plans"
import { getSession, requireUser } from "@/server/session"

/** One query per request, shared by the metadata and the page. */
const loadPlan = cache((userId: string, planId: string) =>
  getPlan(prisma, userId, planId)
)

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/plans/[id]">): Promise<Metadata> {
  const { id } = await params
  const session = await getSession()
  const plan = session ? await loadPlan(session.user.id, id) : null
  return plan ? { title: `${plan.title} · Bible Plan` } : {}
}

const isDone = (day: PlanDetailDay) =>
  day.readings.every((reading) => reading.completedAt !== null)

/** Days grouped by calendar month ("2027-01"), in order. */
function byMonth(days: PlanDetailDay[]): [string, PlanDetailDay[]][] {
  const months = new Map<string, PlanDetailDay[]>()
  for (const day of days) {
    const month = day.date.slice(0, 7)
    months.set(month, [...(months.get(month) ?? []), day])
  }
  return [...months]
}

export default async function PlanPage({
  params,
}: PageProps<"/[locale]/plans/[id]">) {
  const { id } = await params
  const user = await requireUser()
  const plan = await loadPlan(user.id, id)
  if (!plan) notFound()

  const t = await getTranslations("PlanDetail")
  const tPlans = await getTranslations("Plans")
  const locale = (await getLocale()) as Locale
  const today = getToday(user.timezone)
  const percent = plan.totalReadings
    ? Math.round((plan.completedReadings / plan.totalReadings) * 100)
    : 0
  const completed =
    plan.totalReadings > 0 && plan.completedReadings >= plan.totalReadings
  // The month to open: where the first unfinished day is.
  const current = plan.days.find((day) => !isDone(day)) ?? plan.days.at(-1)
  const trackNames = plan.trackNames
    .map((name) => name?.[locale])
    .filter((name): name is string => Boolean(name))
  const date = (value: string) =>
    formatIsoDate(value, locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/plans"
        className="flex w-fit items-center gap-1.5 text-sm text-brand-night/70 hover:text-brand-night dark:text-neutral-100/70 dark:hover:text-neutral-100"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-heading text-3xl font-semibold">{plan.title}</h1>
          <div className="flex gap-2">
            {completed && <Badge>{tPlans("completed")}</Badge>}
            {plan.status !== "ACTIVE" && (
              <Badge variant="secondary">
                {tPlans(plan.status === "PAUSED" ? "paused" : "archived")}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {tPlans("dates", {
            start: date(plan.startDate),
            end: date(plan.endDate),
          })}
          {" · "}
          {tPlans("days", { days: plan.totalDays })}
          {trackNames.length > 1 && (
            <>
              {" · "}
              {t("tracks", { tracks: trackNames.join(", ") })}
            </>
          )}
        </p>
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={tPlans("progressLabel", { title: plan.title })}
            className="h-2.5 overflow-hidden rounded-full bg-brand-night/10 dark:bg-white/10"
          >
            <div
              className="h-full rounded-full bg-brand-gold"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-brand-night/65 dark:text-neutral-100/65">
            {tPlans("progress", {
              completed: plan.completedReadings,
              total: plan.totalReadings,
              percent,
            })}
          </p>
        </div>
        <PlanActions planId={plan.id} status={plan.status} />
      </div>

      <section aria-labelledby="calendar-title" className="flex flex-col gap-3">
        <h2 id="calendar-title" className="font-heading text-xl font-semibold">
          {t("calendar")}
        </h2>
        {byMonth(plan.days).map(([month, days]) => {
          const readings = days.flatMap((day) => day.readings)
          const done = readings.filter((reading) => reading.completedAt).length
          return (
            <details
              key={month}
              open={current?.date.startsWith(month)}
              className="group rounded-3xl bg-white/85 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
                <span className="font-heading text-lg font-semibold first-letter:uppercase">
                  {formatIsoDate(`${month}-01`, locale, {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-sm text-brand-night/60 dark:text-neutral-100/60">
                  {t("monthProgress", {
                    completed: done,
                    total: readings.length,
                  })}
                </span>
              </summary>
              <ol className="flex flex-col divide-y divide-brand-night/10 border-t border-brand-night/10 dark:divide-white/10 dark:border-white/10">
                {days.map((day) => {
                  const isToday = day.date === today
                  return (
                    <li
                      key={day.id}
                      id={isToday ? "today" : undefined}
                      className={cn(
                        "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:gap-6",
                        isToday && "bg-brand-gold/10"
                      )}
                    >
                      <div className="flex shrink-0 flex-row items-baseline gap-2 sm:w-32 sm:flex-col sm:gap-0.5">
                        <span className="font-medium first-letter:uppercase">
                          {formatIsoDate(day.date, locale, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="text-xs text-brand-night/60 dark:text-neutral-100/60">
                          {isToday ? t("today") : t("day", { day: day.day })}
                        </span>
                      </div>
                      <ReadingChecklist
                        readings={toChecklist(day, plan.trackNames, locale)}
                        className="flex-1"
                      />
                    </li>
                  )
                })}
              </ol>
            </details>
          )
        })}
      </section>
    </div>
  )
}
