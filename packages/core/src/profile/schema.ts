import { z } from "zod"

import { localeSchema, timeZoneSchema } from "../schemas/common"
import { maxReadingWpm, minReadingWpm } from "./reading-speed"

export const maxNameLength = 80

/** Profile settings edited on the settings page. */
export const profileSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "required" })
    .max(maxNameLength, { error: "too_long" }),
  locale: localeSchema,
  timezone: timeZoneSchema,
  // Form fields are strings: "180" becomes 180.
  readingWpm: z.coerce
    .number<unknown>()
    .int()
    .min(minReadingWpm)
    .max(maxReadingWpm),
})

export type ProfileSettings = z.infer<typeof profileSettingsSchema>
