import { z } from "zod"

import { parsePassageSlug } from "../bible/slug"
import { isoDateSchema } from "../schemas/common"

export const prayerCategories = [
  "PERSONAL",
  "FAMILY",
  "FRIENDS",
  "CHURCH",
  "WORLD",
  "OTHER",
] as const
export type PrayerCategory = (typeof prayerCategories)[number]

export const prayerStatuses = ["ACTIVE", "ANSWERED", "ARCHIVED"] as const
export type PrayerStatus = (typeof prayerStatuses)[number]

export const maxPrayerTitleLength = 120
export const maxPrayerTextLength = 2000

/** Prayer requests a person can keep, to bound what one account stores. */
export const maxPrayerRequestsPerUser = 500

const optionalText = z
  .string()
  .trim()
  .max(maxPrayerTextLength)
  .transform((text) => (text === "" ? null : text))
  .nullable()
  .default(null)

/** Passages a prayer can refer to. */
export const maxPrayerPassages = 10

/** A prayer request as written in the form. */
export const prayerRequestInputSchema = z.object({
  title: z.string().trim().min(1).max(maxPrayerTitleLength),
  details: optionalText,
  category: z.enum(prayerCategories).default("PERSONAL"),
  /** The day the prayer started; today when left out. */
  startedOn: isoDateSchema.optional(),
  /** Passage slugs ("Ps.51.1-4"), each one a passage of the canon. */
  passages: z
    .array(
      z
        .string()
        .refine((slug) => parsePassageSlug(slug) !== null, {
          error: "invalid_passage",
        })
    )
    .max(maxPrayerPassages)
    .default([]),
})
export type PrayerRequestInput = z.infer<typeof prayerRequestInputSchema>

/** What is written when a prayer is marked answered. */
export const prayerAnswerInputSchema = z.object({
  /** The day it was answered; today when left out. */
  answeredOn: isoDateSchema.optional(),
  /** The circumstances of the answer. */
  answerNote: optionalText,
})
export type PrayerAnswerInput = z.infer<typeof prayerAnswerInputSchema>
