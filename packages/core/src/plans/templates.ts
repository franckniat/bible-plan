import { parseReference } from "../bible/parse"
import type { Passage } from "../bible/passage"
import type { IsoDate, Locale, Weekday } from "../schemas/common"
import type { PlanInput, PlanPace } from "./schema"

type Localized = Record<Locale, string>

/** One track of a template: what is read, in order, and its name if any. */
export type PlanTemplateTrack = {
  /** Shown next to the readings when the plan has several tracks. */
  name?: Localized
  passages: Passage[]
}

export type PlanTemplate = {
  /** Stable identifier, stored with the plans created from the template. */
  key: string
  title: Localized
  description: Localized
  tracks: PlanTemplateTrack[]
  /** Number of reading days at the intended pace. */
  days: number
}

/**
 * Passages from English references ("Gen 1-11; Job; Gen 12-50"). Template
 * data is written in code, so a typo must fail loudly.
 */
export function references(text: string): Passage[] {
  const passages = parseReference(text, { locale: "en" })
  if (!passages) throw new Error(`Invalid template reference: ${text}`)
  return passages
}

/** Plans ready to adopt, in the order they are offered. */
export const planTemplates: readonly PlanTemplate[] = []

export function getPlanTemplate(key: string): PlanTemplate | undefined {
  return planTemplates.find((template) => template.key === key)
}

/**
 * Generator input to adopt a template. The start date and reading days are
 * chosen by the user; the pace defaults to the template's number of days.
 */
export function templatePlanInput(
  template: PlanTemplate,
  options: {
    startDate: IsoDate
    activeWeekdays?: Weekday[]
    pace?: PlanPace
  }
): PlanInput {
  return {
    tracks: template.tracks.map((track) => ({ passages: track.passages })),
    startDate: options.startDate,
    activeWeekdays: options.activeWeekdays,
    pace: options.pace ?? { mode: "days", days: template.days },
  }
}
