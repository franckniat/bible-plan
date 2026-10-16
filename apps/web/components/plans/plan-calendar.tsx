"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import type { IsoDate } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { ChecklistReading } from "@/components/plans/reading-checklist"
import { formatIsoDate } from "@/lib/dates"

export type CalendarDay = {
  id: string
  date: IsoDate
  readings: ChecklistReading[]
}

type Status = "done" | "late" | "upcoming"

const statusClassName: Record<Status, string> = {
  done: "bg-brand-gold text-neutral-950",
  late: "bg-red-600/10 text-red-800 ring-1 ring-red-600/30 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30",
  upcoming:
    "bg-white/85 ring-1 ring-brand-night/15 dark:bg-neutral-900/85 dark:ring-white/15",
}

/** "2027-01" → the month after or before. */
function addMonths(month: string, count: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number]
  const date = new Date(Date.UTC(year, index - 1 + count, 1))
  return date.toISOString().slice(0, 7)
}

/** The days of a month, with blanks before the 1st so that weeks start on Monday. */
function monthCells(month: string): (IsoDate | null)[] {
  const [year, index] = month.split("-").map(Number) as [number, number]
  const first = new Date(Date.UTC(year, index - 1, 1))
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate()
  const blanks = (first.getUTCDay() + 6) % 7
  return [
    ...Array<null>(blanks).fill(null),
    ...Array.from(
      { length },
      (_, day) => `${month}-${String(day + 1).padStart(2, "0")}` as IsoDate
    ),
  ]
}

// 2024-01-01 was a Monday.
const weekdays = Array.from(
  { length: 7 },
  (_, index) => `2024-01-0${index + 1}` as IsoDate
)

/** The plan as a month grid: each day shows whether it is read, late or to come. */
export function PlanCalendar({
  days,
  today,
  showLate,
  initialMonth,
}: {
  days: CalendarDay[]
  today: IsoDate
  /** False for an archived plan: nothing is late any more. */
  showLate: boolean
  initialMonth: string
}) {
  const t = useTranslations("PlanDetail")
  const locale = useLocale()
  const [month, setMonth] = useState(initialMonth)
  const byDate = new Map(days.map((day) => [day.date, day]))
  const firstMonth = days[0]?.date.slice(0, 7) ?? initialMonth
  const lastMonth = days.at(-1)?.date.slice(0, 7) ?? initialMonth

  const statusOf = (day: CalendarDay): Status =>
    day.readings.every((reading) => reading.done)
      ? "done"
      : showLate && day.date < today
        ? "late"
        : "upcoming"

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white/85 p-4 ring-1 ring-brand-night/10 sm:p-5 dark:bg-neutral-900/85 dark:ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={month <= firstMonth}
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label={t("month.previous")}
          title={t("month.previous")}
        >
          <ChevronLeft />
        </Button>
        <h3
          aria-live="polite"
          className="font-heading text-lg font-semibold first-letter:uppercase"
        >
          {formatIsoDate(`${month}-01` as IsoDate, locale, {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          disabled={month >= lastMonth}
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label={t("month.next")}
          title={t("month.next")}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {weekdays.map((date) => (
          <abbr
            key={date}
            title={formatIsoDate(date, locale, { weekday: "long" })}
            className="pb-1 text-xs font-medium text-brand-night/60 no-underline first-letter:uppercase dark:text-neutral-100/60"
          >
            {formatIsoDate(date, locale, { weekday: "short" })}
          </abbr>
        ))}
        {monthCells(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />
          const day = byDate.get(date)
          const status = day && statusOf(day)
          const isToday = date === today
          return (
            <span
              key={date}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm tabular-nums",
                status
                  ? statusClassName[status]
                  : "text-brand-night/35 dark:text-neutral-100/35",
                isToday &&
                  "font-bold outline-2 outline-offset-2 outline-brand-night dark:outline-neutral-100"
              )}
            >
              <span aria-hidden>{Number(date.slice(8))}</span>
              <span className="sr-only">
                {formatIsoDate(date, locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }) + (status ? ` · ${t(`legend.${status}`)}` : "")}
              </span>
            </span>
          )
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-brand-night/70 dark:text-neutral-100/70">
        {(["done", ...(showLate ? ["late"] : []), "upcoming"] as Status[]).map(
          (status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("size-3 rounded", statusClassName[status])}
              />
              {t(`legend.${status}`)}
            </li>
          )
        )}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded outline-2 outline-offset-1 outline-brand-night dark:outline-neutral-100"
          />
          {t("today")}
        </li>
      </ul>
    </div>
  )
}
