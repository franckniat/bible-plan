"use client"

import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import {
  estimateReadingMinutes,
  formatPassage,
  generatePlan,
  getPlanTemplate,
  maxPlanTitleLength,
  PlanGenerationError,
  type GeneratedPlan,
  type Locale,
  type PlanGenerationErrorCode,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { toPlanInput, type WizardState } from "@/components/plans/wizard/state"
import { formatIsoDate } from "@/lib/dates"

/** Days shown before "show all". */
const FIRST_DAYS = 14

type Preview =
  | { plan: GeneratedPlan; error?: undefined }
  | { plan?: undefined; error: PlanGenerationErrorCode | "invalid" }

function preview(state: WizardState): Preview {
  const input = toPlanInput(state)
  if (!input) return { error: "invalid" }
  try {
    return { plan: generatePlan(input) }
  } catch (error) {
    return {
      error: error instanceof PlanGenerationError ? error.code : "invalid",
    }
  }
}

/** Step 4: the calendar computed in the browser, and the plan title. */
export function PreviewStep({
  state,
  readingWpm,
  onTitleChange,
}: {
  state: WizardState
  readingWpm: number
  onTitleChange: (title: string) => void
}) {
  const t = useTranslations("PlanWizard.preview")
  const locale = useLocale() as Locale
  const [showAll, setShowAll] = useState(false)
  const result = useMemo(() => preview(state), [state])

  if (!result.plan) {
    return (
      <p
        role="alert"
        className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {t(`errors.${result.error}`)}
      </p>
    )
  }

  const { plan } = result
  const days = plan.days.length
  const averageVerses = Math.round(plan.totalVerses / days)
  const wpm =
    state.pace.mode === "minutesPerDay" ? state.pace.readingWpm : readingWpm
  const averageMinutes = Math.max(
    1,
    Math.round(estimateReadingMinutes(averageVerses, wpm))
  )
  const trackNames =
    state.type === "template" && state.templateKey
      ? getPlanTemplate(state.templateKey)?.tracks.map((track) => track.name)
      : undefined
  const shownDays = showAll ? plan.days : plan.days.slice(0, FIRST_DAYS)

  return (
    <div className="flex flex-col gap-8">
      <Field>
        <FieldLabel htmlFor="plan-title">{t("title")}</FieldLabel>
        <Input
          id="plan-title"
          value={state.title}
          maxLength={maxPlanTitleLength}
          required
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t("titlePlaceholder")}
          className="h-10"
        />
      </Field>

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          [
            t("summary.dates"),
            t("summary.datesValue", {
              start: formatIsoDate(plan.startDate, locale),
              end: formatIsoDate(plan.endDate, locale),
            }),
          ],
          [t("summary.days"), t("summary.daysValue", { days })],
          [
            t("summary.load"),
            t("summary.loadValue", {
              verses: averageVerses,
              minutes: averageMinutes,
            }),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-white/70 p-4 ring-1 ring-brand-night/10 dark:bg-neutral-900/70 dark:ring-white/10"
          >
            <dt className="text-sm text-brand-night/60 dark:text-neutral-100/60">
              {label}
            </dt>
            <dd className="mt-1 font-heading text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="calendar-title" className="flex flex-col gap-3">
        <h2 id="calendar-title" className="font-heading text-lg font-semibold">
          {t("calendar")}
        </h2>
        <ol className="flex flex-col divide-y divide-brand-night/10 rounded-2xl bg-white/70 ring-1 ring-brand-night/10 dark:divide-white/10 dark:bg-neutral-900/70 dark:ring-white/10">
          {shownDays.map((day) => (
            <li key={day.day} className="flex gap-4 px-4 py-3 text-sm">
              <span className="w-28 shrink-0 text-brand-night/60 first-letter:uppercase dark:text-neutral-100/60">
                {formatIsoDate(day.date, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                {day.readings.map((reading, index) => {
                  const name = trackNames?.[reading.track]?.[locale]
                  return (
                    <span key={index}>
                      {name && (
                        <span className="text-brand-night/60 dark:text-neutral-100/60">
                          {t("track", { name })}{" "}
                        </span>
                      )}
                      <span className="font-medium">
                        {formatPassage(reading.passage, locale)}
                      </span>
                    </span>
                  )
                })}
              </span>
            </li>
          ))}
        </ol>
        {days > FIRST_DAYS && (
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
          >
            {showAll ? t("showLess") : t("showAll", { days })}
          </Button>
        )}
      </section>
    </div>
  )
}
