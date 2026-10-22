import { z } from "zod"

import { passageSchema } from "../bible/passage"
import {
  allWeekdays,
  isoDateSchema,
  weekdaysSchema,
  type Locale,
} from "../schemas/common"
import { planPaceSchema, type PlanInput } from "./schema"
import {
  getPlanTemplate,
  templatePlanInput,
  type PlanTemplateTrack,
} from "./templates"

export const maxPlanTitleLength = 100
/** Passages of a custom plan (books or ranges picked one by one). */
export const maxCustomPassages = 200

const titleSchema = z
  .string()
  .trim()
  .min(1, { error: "required" })
  .max(maxPlanTitleLength, { error: "too_long" })

const scheduleFields = {
  /** The group the plan is for: every member follows it (members only). */
  groupId: z.uuid().optional(),
  startDate: isoDateSchema,
  activeWeekdays: weekdaysSchema.default([...allWeekdays]),
  pace: planPaceSchema,
}

/**
 * A plan to create, as sent by the web or mobile app: from a template (the
 * server takes its passages) or from passages chosen by the user.
 */
export const newPlanSchema = z
  .discriminatedUnion("source", [
    z.object({
      source: z.literal("template"),
      templateKey: z
        .string()
        .refine((key) => getPlanTemplate(key) !== undefined, {
          error: "unknown_template",
        }),
      /** Defaults to the template title in the user's language. */
      title: titleSchema.optional(),
      ...scheduleFields,
    }),
    z.object({
      source: z.literal("custom"),
      title: titleSchema,
      passages: z.array(passageSchema).min(1).max(maxCustomPassages),
      ...scheduleFields,
    }),
  ])
  .refine(
    ({ startDate, pace }) =>
      pace.mode !== "endDate" || pace.endDate >= startDate,
    { error: "end_before_start", path: ["pace", "endDate"] }
  )

export type NewPlan = z.input<typeof newPlanSchema>
export type ParsedNewPlan = z.output<typeof newPlanSchema>

export type ResolvedNewPlan = {
  title: string
  templateKey: string | null
  tracks: PlanTemplateTrack[]
  input: PlanInput
}

/** Title, tracks and generator input of a validated plan request. */
export function resolveNewPlan(
  plan: ParsedNewPlan,
  locale: Locale
): ResolvedNewPlan {
  const { startDate, activeWeekdays, pace } = plan
  if (plan.source === "template") {
    const template = getPlanTemplate(plan.templateKey)!
    return {
      title: plan.title ?? template.title[locale],
      templateKey: template.key,
      tracks: template.tracks,
      input: templatePlanInput(template, { startDate, activeWeekdays, pace }),
    }
  }
  const tracks = [{ passages: plan.passages }]
  return {
    title: plan.title,
    templateKey: null,
    tracks,
    input: { tracks, startDate, activeWeekdays, pace },
  }
}
