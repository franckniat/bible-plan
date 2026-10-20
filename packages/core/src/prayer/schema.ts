import { z } from "zod"

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

/** A prayer request as written in the form. */
export const prayerRequestInputSchema = z.object({
  title: z.string().trim().min(1).max(maxPrayerTitleLength),
  details: optionalText,
  category: z.enum(prayerCategories).default("PERSONAL"),
})
export type PrayerRequestInput = z.infer<typeof prayerRequestInputSchema>

/** The note written when a prayer is marked answered. */
export const prayerAnswerInputSchema = z.object({
  answerNote: optionalText,
})
export type PrayerAnswerInput = z.infer<typeof prayerAnswerInputSchema>
