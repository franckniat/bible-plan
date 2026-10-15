"use client"

import { useLocale, useTranslations } from "next-intl"

import {
  addDays,
  maxMinutesPerDay,
  maxPlanDays,
  type IsoDate,
  type PlanPace,
  type Weekday,
} from "@workspace/core"
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import {
  choiceCardClassName,
  choiceInputClassName,
} from "@/components/choice-card"
import type { WizardType } from "@/components/plans/wizard/state"
import { Link } from "@/i18n/navigation"

type PaceMode = PlanPace["mode"]

/** Paces offered for each kind of plan. */
const modesByType: Record<WizardType, PaceMode[]> = {
  template: ["days", "endDate", "minutesPerDay"],
  duration: ["days", "endDate"],
  time: ["minutesPerDay"],
  free: ["days", "endDate", "minutesPerDay"],
}

const quickDays = [30, 90, 180, 365]
const quickMinutes = [5, 10, 15, 20, 30]

const chipClassName = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
    active
      ? "border-brand-night bg-brand-night text-brand-cream dark:border-brand-gold dark:bg-brand-gold dark:text-neutral-950"
      : "border-brand-night/15 bg-white/60 hover:border-brand-night/40 dark:border-white/15 dark:bg-neutral-900/60 dark:hover:border-white/40"
  )

/** Weekdays in the order the language lists them (Monday first in French). */
function orderedWeekdays(locale: string): Weekday[] {
  return locale === "en" ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0]
}

/** Name of a weekday: 2027-01-03 is a Sunday. */
function weekdayName(
  weekday: Weekday,
  locale: string,
  width: "short" | "long"
) {
  return new Intl.DateTimeFormat(locale, {
    weekday: width,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2027, 0, 3 + weekday)))
}

/** Step 3: when to start, on which days, and how long the plan lasts. */
export function ScheduleStep({
  type,
  startDate,
  activeWeekdays,
  pace,
  readingWpm,
  suggestedDays,
  onChange,
}: {
  type: WizardType
  startDate: IsoDate
  activeWeekdays: Weekday[]
  pace: PlanPace
  readingWpm: number
  /** Default length when switching to a number of days or an end date. */
  suggestedDays: number
  onChange: (changes: {
    startDate?: IsoDate
    activeWeekdays?: Weekday[]
    pace?: PlanPace
  }) => void
}) {
  const t = useTranslations("PlanWizard.schedule")
  const locale = useLocale()
  const modes = modesByType[type]

  function setMode(mode: PaceMode) {
    switch (mode) {
      case "days":
        return onChange({ pace: { mode, days: suggestedDays } })
      case "endDate":
        return onChange({
          pace: { mode, endDate: addDays(startDate, suggestedDays - 1) },
        })
      case "minutesPerDay":
        return onChange({ pace: { mode, minutes: 15, readingWpm } })
    }
  }

  function toggleWeekday(weekday: Weekday) {
    onChange({
      activeWeekdays: activeWeekdays.includes(weekday)
        ? activeWeekdays.filter((day) => day !== weekday)
        : [...activeWeekdays, weekday].sort(),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <Field>
        <FieldLabel htmlFor="start-date">{t("startDate")}</FieldLabel>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          required
          onChange={(event) => {
            if (event.target.value) onChange({ startDate: event.target.value })
          }}
          className="h-10 w-fit"
        />
      </Field>

      <FieldSet>
        <FieldLegend variant="label">{t("weekdays.legend")}</FieldLegend>
        <FieldDescription>{t("weekdays.hint")}</FieldDescription>
        <div className="flex flex-wrap gap-2">
          {orderedWeekdays(locale).map((weekday) => {
            const active = activeWeekdays.includes(weekday)
            return (
              <button
                key={weekday}
                type="button"
                aria-pressed={active}
                aria-label={weekdayName(weekday, locale, "long")}
                onClick={() => toggleWeekday(weekday)}
                className={cn(chipClassName(active), "min-w-12 capitalize")}
              >
                {weekdayName(weekday, locale, "short")}
              </button>
            )
          })}
        </div>
        {activeWeekdays.length === 0 && (
          <p role="alert" className="text-sm text-destructive">
            {t("weekdays.required")}
          </p>
        )}
      </FieldSet>

      {modes.length > 1 && (
        <FieldSet>
          <FieldLegend variant="label">{t("mode.legend")}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-3">
            {modes.map((mode) => (
              <label key={mode} className={choiceCardClassName}>
                <input
                  type="radio"
                  name="pace-mode"
                  checked={pace.mode === mode}
                  onChange={() => setMode(mode)}
                  className={choiceInputClassName}
                />
                <span className="font-medium">{t(`mode.${mode}`)}</span>
              </label>
            ))}
          </div>
        </FieldSet>
      )}

      {pace.mode === "days" && (
        <Field>
          <FieldLabel htmlFor="days">{t("days.label")}</FieldLabel>
          <Input
            id="days"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxPlanDays}
            value={Number.isNaN(pace.days) ? "" : pace.days}
            onChange={(event) =>
              onChange({
                pace: { mode: "days", days: event.target.valueAsNumber },
              })
            }
            className="h-10 w-32"
          />
          <div className="flex flex-wrap gap-2">
            {quickDays.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={pace.days === days}
                onClick={() => onChange({ pace: { mode: "days", days } })}
                className={chipClassName(pace.days === days)}
              >
                {t("days.quick", { days })}
              </button>
            ))}
          </div>
        </Field>
      )}

      {pace.mode === "endDate" && (
        <Field>
          <FieldLabel htmlFor="end-date">{t("endDate.label")}</FieldLabel>
          <Input
            id="end-date"
            type="date"
            min={startDate}
            value={pace.endDate}
            onChange={(event) => {
              if (event.target.value) {
                onChange({
                  pace: { mode: "endDate", endDate: event.target.value },
                })
              }
            }}
            aria-invalid={pace.endDate < startDate || undefined}
            className="h-10 w-fit"
          />
          {pace.endDate < startDate && (
            <p role="alert" className="text-sm text-destructive">
              {t("endDate.beforeStart")}
            </p>
          )}
        </Field>
      )}

      {pace.mode === "minutesPerDay" && (
        <Field>
          <FieldLabel htmlFor="minutes">{t("minutes.label")}</FieldLabel>
          <Input
            id="minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxMinutesPerDay}
            value={Number.isNaN(pace.minutes) ? "" : pace.minutes}
            onChange={(event) =>
              onChange({
                pace: { ...pace, minutes: event.target.valueAsNumber },
              })
            }
            aria-describedby="minutes-hint"
            className="h-10 w-32"
          />
          <div className="flex flex-wrap gap-2">
            {quickMinutes.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={pace.minutes === minutes}
                onClick={() => onChange({ pace: { ...pace, minutes } })}
                className={chipClassName(pace.minutes === minutes)}
              >
                {t("minutes.quick", { minutes })}
              </button>
            ))}
          </div>
          <FieldDescription id="minutes-hint">
            {t.rich("minutes.hint", {
              wpm: pace.readingWpm,
              settings: (chunks) => (
                <Link href="/settings" className="underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </FieldDescription>
        </Field>
      )}
    </div>
  )
}
