"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, type ReactNode } from "react"

import { maxCustomPassages, type IsoDate } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"

import {
  defaultPace,
  getSteps,
  initialWizardState,
  type WizardState,
  type WizardStep,
} from "@/components/plans/wizard/state"
import { SelectionStep } from "@/components/plans/wizard/selection-step"
import { TypeStep } from "@/components/plans/wizard/type-step"

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
  const [state, setState] = useState(() =>
    initialWizardState({ today, templateKey: initialTemplateKey })
  )
  const steps = getSteps(state.type)
  // A template chosen beforehand skips the first step.
  const [stepIndex, setStepIndex] = useState(state.templateKey ? 1 : 0)
  const step = steps[stepIndex] ?? "type"

  const update = (changes: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...changes }))

  const views: Partial<Record<WizardStep, ReactNode>> = {
    type: (
      <TypeStep
        type={state.type}
        templateKey={state.templateKey}
        onTypeChange={(type) =>
          update({
            type,
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
  }
  const hasNext = stepIndex < steps.length - 1 && views[steps[stepIndex + 1]!]

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
        {hasNext && (
          <Button
            type="button"
            size="lg"
            className="h-11 sm:px-6"
            disabled={!isStepComplete(step, state)}
            onClick={() => setStepIndex(stepIndex + 1)}
          >
            {t("nav.next")}
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  )
}
