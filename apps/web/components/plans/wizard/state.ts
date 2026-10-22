import {
  allWeekdays,
  countVerses,
  getBookName,
  getPlanTemplate,
  maxPlanDays,
  templatePlanInput,
  versesForMinutes,
  type IsoDate,
  type Locale,
  type NewPlan,
  type Passage,
  type PlanInput,
  type PlanPace,
  type Weekday,
} from "@workspace/core"

/** The five ways of creating a plan. */
export const wizardTypes = [
  "template",
  "duration",
  "time",
  "chapters",
  "free",
] as const
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
  /** Whether the user changed the pace; until then it follows the selection. */
  paceEdited: boolean
  title: string
  /** The group the plan is for; null for a personal plan. */
  groupId: string | null
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
  groupId = null,
}: {
  today: IsoDate
  templateKey?: string | null
  groupId?: string | null
}): WizardState {
  const template = templateKey ? getPlanTemplate(templateKey) : undefined
  return {
    type: template ? "template" : null,
    templateKey: template?.key ?? null,
    passages: [],
    startDate: today,
    activeWeekdays: [...allWeekdays],
    pace: { mode: "days", days: template?.days ?? 30 },
    paceEdited: false,
    title: "",
    groupId,
  }
}

/** Reading time used to suggest how long a selection takes. */
const SUGGESTED_MINUTES_PER_DAY = 10

/**
 * Number of days suggested for the plan: the template length, or about ten
 * minutes of reading a day for the selection.
 */
export function suggestDays(state: WizardState, readingWpm: number): number {
  if (state.type === "template") {
    return (state.templateKey && getPlanTemplate(state.templateKey)?.days) || 30
  }
  const perDay = Math.max(
    1,
    versesForMinutes(SUGGESTED_MINUTES_PER_DAY, readingWpm)
  )
  return Math.min(
    maxPlanDays,
    Math.max(1, Math.ceil(countVerses(state.passages) / perDay))
  )
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
    case "chapters":
      return { mode: "chaptersPerDay", chapters: 3 }
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
  if (bookIds.size === 1 && only) return getBookName(only, locale)
  // From a book to a book: "Genèse – Deutéronome".
  const first = state.passages[0]?.book
  const last = state.passages.at(-1)?.book
  return state.type === "chapters" && first && last
    ? `${getBookName(first, locale)} – ${getBookName(last, locale)}`
    : ""
}

/** The request sent to the server to create the plan. */
export function toNewPlan(state: WizardState): NewPlan | null {
  const { title, startDate, activeWeekdays, pace } = state
  const groupId = state.groupId ?? undefined
  if (state.type === "template") {
    return state.templateKey
      ? {
          source: "template",
          templateKey: state.templateKey,
          title: title.trim() || undefined,
          groupId,
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
    groupId,
    startDate,
    activeWeekdays,
    pace,
  }
}
