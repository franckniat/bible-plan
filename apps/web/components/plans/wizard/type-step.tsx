"use client"

import { BookOpen, CalendarRange, Clock, Library } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { planTemplates, type Locale } from "@workspace/core"
import { FieldLegend, FieldSet } from "@workspace/ui/components/field"

import {
  choiceCardClassName,
  choiceInputClassName,
} from "@/components/choice-card"
import type { WizardType } from "@/components/plans/wizard/state"

const typeIcons = {
  template: Library,
  duration: CalendarRange,
  time: Clock,
  free: BookOpen,
} satisfies Record<WizardType, unknown>

/** Step 1: how to build the plan, and which template if any. */
export function TypeStep({
  type,
  templateKey,
  onTypeChange,
  onTemplateChange,
}: {
  type: WizardType | null
  templateKey: string | null
  onTypeChange: (type: WizardType) => void
  onTemplateChange: (key: string) => void
}) {
  const t = useTranslations("PlanWizard.type")
  const locale = useLocale() as Locale

  return (
    <div className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>{t("legend")}</FieldLegend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(typeIcons) as WizardType[]).map((value) => {
            const Icon = typeIcons[value]
            return (
              <label key={value} className={choiceCardClassName}>
                <input
                  type="radio"
                  name="type"
                  value={value}
                  checked={type === value}
                  onChange={() => onTypeChange(value)}
                  className={choiceInputClassName}
                />
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium">
                    <Icon aria-hidden className="size-4 text-brand-gold" />
                    {t(`${value}.label`)}
                  </span>
                  <span className="text-brand-night/65 dark:text-neutral-100/65">
                    {t(`${value}.description`)}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </FieldSet>

      {type === "template" && (
        <FieldSet>
          <FieldLegend>{t("templateLegend")}</FieldLegend>
          <div className="flex flex-col gap-3">
            {planTemplates.map((template) => (
              <label key={template.key} className={choiceCardClassName}>
                <input
                  type="radio"
                  name="template"
                  value={template.key}
                  checked={templateKey === template.key}
                  onChange={() => onTemplateChange(template.key)}
                  className={choiceInputClassName}
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">
                    {template.title[locale]}
                    <span className="ml-2 font-normal text-brand-night/60 dark:text-neutral-100/60">
                      {t("days", { days: template.days })}
                    </span>
                  </span>
                  <span className="text-brand-night/65 dark:text-neutral-100/65">
                    {template.description[locale]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </FieldSet>
      )}
    </div>
  )
}
