import { z } from "zod"

import { passageSchema, type Passage } from "../bible/passage"
import { maxReadingWpm, minReadingWpm } from "../profile/reading-speed"
import {
  allWeekdays,
  isoDateSchema,
  weekdaysSchema,
  type IsoDate,
} from "../schemas/common"

/** Longest plan accepted: 10 years of daily reading. */
export const maxPlanDays = 3650
/** Parallel tracks read every day, e.g. Old and New Testament (M'Cheyne has 4). */
export const maxTracks = 4
export const maxMinutesPerDay = 240
/** Chapters read on a day, at most, when the pace is a number of chapters. */
export const maxChaptersPerDay = 50

/** How the length of the plan is chosen. */
export const planPaceSchema = z.discriminatedUnion("mode", [
  // A number of reading days.
  z.object({ mode: z.literal("days"), days: z.int().min(1).max(maxPlanDays) }),
  // Every active day from the start date up to this date (included).
  z.object({ mode: z.literal("endDate"), endDate: isoDateSchema }),
  // About `minutes` of reading on an average day (a guide, not a limit).
  z.object({
    mode: z.literal("minutesPerDay"),
    minutes: z.int().min(1).max(maxMinutesPerDay),
    readingWpm: z.int().min(minReadingWpm).max(maxReadingWpm),
  }),
  // A number of chapters on each reading day, until the passages are read.
  z.object({
    mode: z.literal("chaptersPerDay"),
    chapters: z.int().min(1).max(maxChaptersPerDay),
  }),
])

export type PlanPace = z.infer<typeof planPaceSchema>

export const planTrackSchema = z.object({
  /** Passages read in this order. */
  passages: z.array(passageSchema).min(1),
})

export const planInputSchema = z
  .object({
    tracks: z.array(planTrackSchema).min(1).max(maxTracks),
    /** First possible reading day. */
    startDate: isoDateSchema,
    /** Days of the week with a reading (0 = Sunday). */
    activeWeekdays: weekdaysSchema.default([...allWeekdays]),
    pace: planPaceSchema,
  })
  .refine(
    ({ startDate, pace }) =>
      pace.mode !== "endDate" || pace.endDate >= startDate,
    { error: "end_before_start", path: ["pace", "endDate"] }
  )

export type PlanInput = z.input<typeof planInputSchema>
export type ParsedPlanInput = z.output<typeof planInputSchema>

/** One passage to read on a day, from one of the tracks. */
export type PlanReading = {
  /** Index of the track in the input. */
  track: number
  passage: Passage
  verses: number
}

export type PlanDay = {
  /** 1 for the first reading day. */
  day: number
  date: IsoDate
  readings: PlanReading[]
  /** Verses of the day, all tracks together. */
  verses: number
}

export type GeneratedPlan = {
  startDate: IsoDate
  /** Date of the last reading day. */
  endDate: IsoDate
  days: PlanDay[]
  totalVerses: number
}

export type PlanGenerationErrorCode =
  /** No active weekday between the start and end dates. */
  | "no_active_days"
  /** More reading days than verses to read. */
  | "too_many_days"
  /** The end date makes the plan longer than maxPlanDays. */
  | "too_long"

/** Input that is valid but cannot produce a plan. */
export class PlanGenerationError extends Error {
  constructor(readonly code: PlanGenerationErrorCode) {
    super(`Cannot generate the plan: ${code}`)
    this.name = "PlanGenerationError"
  }
}
