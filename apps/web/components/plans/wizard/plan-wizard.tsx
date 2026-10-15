"use client"

import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState, useTransition, type ReactNode } from "react"

import {
  maxCustomPassages,
  planPaceSchema,
  type IsoDate,
  type Locale,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"

import {
  defaultPace,
  getSteps,
  initialWizardState,
  suggestDays,
  suggestTitle,
  toNewPlan,
  type WizardState,
  type WizardStep,
} from "@/components/plans/wizard/state"
import {
  previewPlan,
  PreviewStep,
} from "@/components/plans/wizard/preview-step"
import { ScheduleStep } from "@/components/plans/wizard/schedule-step"
import {
  findPreset,
  SelectionStep,
} from "@/components/plans/wizard/selection-step"
import { TypeStep } from "@/components/plans/wizard/type-step"
import {
  createPlanAction,
  type CreatePlanErrorCode,
} from "@/server/actions/plans"

type PlanWizardProps = {
  /** Today in the user's time zone: the default start date. */
  today: IsoDate
  /** The user's reading speed, for the minutes-per-day pace. */
  readingWpm: number
  /** Template chosen beforehand (e.g. from the templates page). */
  initialTemplateKey?: string | null
}

/** Whether the user can leave a step. */
function isStepComplete(step: WizardStep, state: WizardState): boolean {
  switch (step) {
    case "type":
      return (
        state.type !== null &&
        (state.type !== "template" || state.templateKey !== null)
      )
    case "selection":
      return (
        state.passages.length > 0 && state.passages.length <= maxCustomPassages
      )
    case "schedule":
      return (
        state.activeWeekdays.length > 0 &&
        planPaceSchema.safeParse(state.pace).success &&
        (state.pace.mode !== "endDate" || state.pace.endDate >= state.startDate)
      )
    default:
      return true
  }
}

/** Plan creation in a few steps: type, selection, pace, preview. */
export function PlanWizard({
  today,
  readingWpm,
  initialTemplateKey,
}: PlanWizardProps) {
  const t = useTranslations("PlanWizard")
  const locale = useLocale() as Locale
  const [state, setState] = useState(() =>
    initialWizardState({ today, templateKey: initialTemplateKey })
  )
  const steps = getSteps(state.type)
  // A template chosen beforehand skips the first step.
  const [stepIndex, setStepIndex] = useState(state.templateKey ? 1 : 0)
  const step = steps[stepIndex] ?? "type"

  const update = (changes: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...changes }))

  const onPreview = step === "preview"
  const preview = useMemo(
    () => (onPreview ? previewPlan(state) : null),
    [onPreview, state]
  )
  const [creating, startCreating] = useTransition()
  const [createError, setCreateError] = useState<CreatePlanErrorCode | null>(
    null
  )
  const canCreate =
    preview?.plan !== undefined && state.title.trim() !== "" && !creating

  function create() {
    const request = toNewPlan(state)
    if (!request) return
    setCreateError(null)
    startCreating(async () => {
      // On success the action redirects to the plan list.
      const result = await createPlanAction(request)
      if (result?.error) setCreateError(result.error)
    })
  }

  const views: Partial<Record<WizardStep, ReactNode>> = {
    type: (
      <TypeStep
        type={state.type}
        templateKey={state.templateKey}
        onTypeChange={(type) =>
          update({
            type,
            paceEdited: false,
            pace: defaultPace(type, {
              templateKey: state.templateKey,
              readingWpm,
            }),
          })
        }
        onTemplateChange={(templateKey) =>
          update({
            templateKey,
            pace: defaultPace("template", { templateKey, readingWpm }),
          })
        }
      />
    ),
    selection: (
      <SelectionStep
        passages={state.passages}
        onChange={(passages) => update({ passages })}
        free={state.type === "free"}
      />
    ),
    schedule: state.type && (
      <ScheduleStep
        type={state.type}
        startDate={state.startDate}
        activeWeekdays={state.activeWeekdays}
        pace={state.pace}
        readingWpm={readingWpm}
        suggestedDays={suggestDays(state, readingWpm)}
        onChange={(changes) =>
          update({ ...changes, paceEdited: state.paceEdited || !!changes.pace })
        }
      />
    ),
    preview: preview && (
      <PreviewStep
        state={state}
        result={preview}
        readingWpm={readingWpm}
        onTitleChange={(title) => update({ title })}
      />
    ),
  }
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-brand-night/60 dark:text-neutral-100/60">
          {t("stepOf", { current: stepIndex + 1, total: steps.length })}
          {" · "}
          {t(`steps.${step}`)}
        </p>
        <ol className="flex gap-1.5" aria-hidden>
          {steps.map((value, index) => (
            <li
              key={value}
              className={
                index <= stepIndex
                  ? "h-1.5 flex-1 rounded-full bg-brand-gold"
                  : "h-1.5 flex-1 rounded-full bg-brand-night/10 dark:bg-white/10"
              }
            />
          ))}
        </ol>
      </div>

      {views[step]}

      {createError && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t(`create.errors.${createError}`)}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11"
            onClick={() => setStepIndex(stepIndex - 1)}
          >
            <ArrowLeft />
            {t("nav.back")}
          </Button>
        ) : (
          <span />
        )}
        {isLast ? (
          <Button
            type="button"
            size="lg"
            className="h-11 sm:px-6"
            disabled={!canCreate}
            onClick={create}
          >
            {creating ? <LoaderCircle className="animate-spin" /> : <Check />}
            {creating ? t("create.submitting") : t("create.submit")}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-11 sm:px-6"
            disabled={!isStepComplete(step, state)}
            onClick={() => {
              // Leaving the selection: size the plan from it, unless the user
              // already chose a length.
              if (
                step === "selection" &&
                !state.paceEdited &&
                state.pace.mode === "days"
              ) {
                update({
                  pace: { mode: "days", days: suggestDays(state, readingWpm) },
                })
              }
              // Arriving on the preview: suggest a title if there is none.
              if (steps[stepIndex + 1] === "preview" && !state.title.trim()) {
                const preset = findPreset(state.passages)
                update({
                  title:
                    suggestTitle(state, locale) ||
                    (preset ? t(`selection.preset.${preset}`) : ""),
                })
              }
              setStepIndex(stepIndex + 1)
            }}
          >
            {t("nav.next")}
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  )
}
