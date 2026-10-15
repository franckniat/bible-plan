import {
  allWeekdays,
  getPlanTemplate,
  type IsoDate,
  type Passage,
  type PlanPace,
  type Weekday,
} from "@workspace/core"

/** The four ways of creating a plan. */
export const wizardTypes = ["template", "duration", "time", "free"] as const
export type WizardType = (typeof wizardTypes)[number]

export type WizardStep = "type" | "selection" | "schedule" | "preview"

export type WizardState = {
  type: WizardType | null
  templateKey: string | null
  /** Passages to read, in order (not used for templates). */
  passages: Passage[]
  startDate: IsoDate
  activeWeekdays: Weekday[]
  pace: PlanPace
  title: string
}

/** Steps of each kind of plan; templates bring their own passages. */
export function getSteps(type: WizardType | null): WizardStep[] {
  return type === "template"
    ? ["type", "schedule", "preview"]
    : ["type", "selection", "schedule", "preview"]
}

export function initialWizardState({
  today,
  templateKey,
}: {
  today: IsoDate
  templateKey?: string | null
}): WizardState {
  const template = templateKey ? getPlanTemplate(templateKey) : undefined
  return {
    type: template ? "template" : null,
    templateKey: template?.key ?? null,
    passages: [],
    startDate: today,
    activeWeekdays: [...allWeekdays],
    pace: { mode: "days", days: template?.days ?? 30 },
    title: "",
  }
}

/** Pace suggested for a kind of plan, when the user picks it. */
export function defaultPace(
  type: WizardType,
  {
    templateKey,
    readingWpm,
  }: { templateKey: string | null; readingWpm: number }
): PlanPace {
  switch (type) {
    case "template":
      return {
        mode: "days",
        days: (templateKey && getPlanTemplate(templateKey)?.days) || 30,
      }
    case "duration":
      return { mode: "days", days: 90 }
    case "time":
      return { mode: "minutesPerDay", minutes: 15, readingWpm }
    case "free":
      return { mode: "days", days: 30 }
  }
}
