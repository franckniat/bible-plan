import { z } from "zod"

import { countryCodeSchema } from "../countries"
import { localeSchema } from "../schemas/common"

/** Features a person on the waitlist can say they are interested in. */
export const waitlistInterests = [
  "plans",
  "reminders",
  "prayer",
  "meditation",
  "groups",
] as const
export type WaitlistInterest = (typeof waitlistInterests)[number]

/** Empty form fields become `undefined`. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional()
  )

export const waitlistSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "invalid_email" }).max(254)),
  firstName: optional(z.string().trim().max(60, { error: "too_long" })),
  country: optional(countryCodeSchema),
  interests: z
    .array(z.enum(waitlistInterests))
    .max(waitlistInterests.length)
    .transform((interests) => [...new Set(interests)])
    .default([]),
  locale: localeSchema,
  consent: z.literal(true, { error: "consent_required" }),
})

export type WaitlistSignup = z.infer<typeof waitlistSignupSchema>
