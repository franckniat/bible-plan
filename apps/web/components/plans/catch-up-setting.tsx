"use client"

import { Check, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { catchUpStrategies, type CatchUpStrategy } from "@workspace/core"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"

import {
  choiceCardClassName,
  choiceInputClassName,
} from "@/components/choice-card"
import { setCatchUpStrategyAction } from "@/server/actions/plans"

/** What happens when the plan is late; saved as soon as it is chosen. */
export function CatchUpSetting({
  planId,
  strategy,
}: {
  planId: string
  strategy: CatchUpStrategy
}) {
  const t = useTranslations("PlanDetail.catchUp")
  const [value, setValue] = useState(strategy)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle")

  function choose(next: CatchUpStrategy) {
    const previous = value
    setValue(next)
    setStatus("idle")
    startTransition(async () => {
      const { ok } = await setCatchUpStrategyAction(planId, next).catch(() => ({
        ok: false,
      }))
      if (ok) setStatus("saved")
      else {
        setValue(previous)
        setStatus("failed")
      }
    })
  }

  return (
    <FieldSet>
      <FieldLegend>{t("legend")}</FieldLegend>
      <FieldDescription>{t("description")}</FieldDescription>
      <div className="flex flex-col gap-3">
        {catchUpStrategies.map((option) => (
          <label key={option} className={choiceCardClassName}>
            <input
              type="radio"
              name="catch-up-strategy"
              value={option}
              checked={value === option}
              disabled={pending}
              onChange={() => choose(option)}
              className={choiceInputClassName}
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{t(`${option}.label`)}</span>
              <span className="text-brand-night/65 dark:text-neutral-100/65">
                {t(`${option}.description`)}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p aria-live="polite" className="min-h-5 text-sm">
        {pending ? (
          <span className="flex items-center gap-1.5 text-brand-night/60 dark:text-neutral-100/60">
            <LoaderCircle className="size-4 animate-spin" />
            {t("saving")}
          </span>
        ) : status === "saved" ? (
          <span className="flex items-center gap-1.5 text-brand-night/60 dark:text-neutral-100/60">
            <Check className="size-4" />
            {t("saved")}
          </span>
        ) : status === "failed" ? (
          <span className="text-destructive">{t("failed")}</span>
        ) : null}
      </p>
    </FieldSet>
  )
}
