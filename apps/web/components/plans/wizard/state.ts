import {
  allWeekdays,
  getBookName,
  getPlanTemplate,
  templatePlanInput,
  type IsoDate,
  type Locale,
  type NewPlan,
  type Passage,
  type PlanInput,
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

/** Generator input of the wizard (a template brings its own tracks). */
export function toPlanInput(state: WizardState): PlanInput | null {
  const { startDate, activeWeekdays, pace } = state
  if (state.type === "template") {
    const template = state.templateKey && getPlanTemplate(state.templateKey)
    return template
      ? templatePlanInput(template, { startDate, activeWeekdays, pace })
      : null
  }
  return {
    tracks: [{ passages: state.passages }],
    startDate,
    activeWeekdays,
    pace,
  }
}

/** Title suggested for the plan: the template, or the single book read. */
export function suggestTitle(state: WizardState, locale: Locale): string {
  if (state.type === "template" && state.templateKey) {
    return getPlanTemplate(state.templateKey)?.title[locale] ?? ""
  }
  const bookIds = new Set(state.passages.map((passage) => passage.book))
  const [only] = bookIds
  return bookIds.size === 1 && only ? getBookName(only, locale) : ""
}

/** The request sent to the server to create the plan. */
export function toNewPlan(state: WizardState): NewPlan | null {
  const { title, startDate, activeWeekdays, pace } = state
  if (state.type === "template") {
    return state.templateKey
      ? {
          source: "template",
          templateKey: state.templateKey,
          title: title.trim() || undefined,
          startDate,
          activeWeekdays,
          pace,
        }
      : null
  }
  return {
    source: "custom",
    title,
    passages: state.passages,
    startDate,
    activeWeekdays,
    pace,
  }
}
