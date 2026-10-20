import { z } from "zod"

import { parsePassageSlug } from "../bible/slug"

/** Durations offered to start a session, in minutes. */
export const meditationMinutes = [5, 10, 15, 20, 30] as const
export const prayerMinutes = [15, 30, 45, 60, 90] as const

export const sessionKinds = ["MEDITATION", "PRAYER"] as const
export type SessionKind = (typeof sessionKinds)[number]

export const minMeditationMinutes = 1
/** Long enough for several hours of prayer: the same limit for both kinds. */
export const maxMeditationMinutes = 240

export const maxNoteTextLength = 5000

const passageSlugSchema = z
  .string()
  .refine((slug) => parsePassageSlug(slug) !== null, {
    error: "invalid_passage",
  })

/** A finished session, as the timer reports it. */
export const meditationSessionInputSchema = z
  .object({
    /** A time of meditation or of prayer: the same timer. */
    kind: z.enum(sessionKinds).default("MEDITATION"),
    /** The passage meditated on, as a passage slug. */
    passage: passageSlugSchema.nullable().default(null),
    plannedSeconds: z
      .int()
      .min(minMeditationMinutes * 60)
      .max(maxMeditationMinutes * 60),
    /** The time really spent, pauses excluded. */
    durationSeconds: z
      .int()
      .min(1)
      .max(maxMeditationMinutes * 60 * 2),
    startedAt: z.iso.datetime(),
  })
  .refine(
    // Spent time can run a little over the plan (an overtime), never wildly.
    ({ plannedSeconds, durationSeconds }) =>
      durationSeconds <= plannedSeconds * 2,
    { error: "duration" }
  )
export type MeditationSessionInput = z.infer<
  typeof meditationSessionInputSchema
>

const optionalText = z
  .string()
  .trim()
  .max(maxNoteTextLength)
  .transform((text) => (text === "" ? null : text))
  .nullable()
  .default(null)

/** A meditation note as written in the editor. */
export const meditationNoteInputSchema = z
  .object({
    /** The passage the note is about, as a passage slug. */
    passage: passageSlugSchema,
    /** The key verse, a passage slug inside the passage or not. */
    keyVerse: passageSlugSchema.nullable().default(null),
    reflection: optionalText,
    application: optionalText,
    /** The session the note was written after. */
    sessionId: z.uuid().nullable().default(null),
  })
  .refine(
    ({ keyVerse, reflection, application }) =>
      keyVerse !== null || reflection !== null || application !== null,
    { error: "empty", path: ["reflection"] }
  )
export type MeditationNoteInput = z.infer<typeof meditationNoteInputSchema>
