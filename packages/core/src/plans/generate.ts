import { countPassageVerses } from "../bible/weight"
import type { IsoDate } from "../schemas/common"
import { computeActiveDates } from "./dates"
import { balancedPartition } from "./partition"
import {
  planInputSchema,
  PlanGenerationError,
  type GeneratedPlan,
  type ParsedPlanInput,
  type PlanDay,
  type PlanInput,
  type PlanReading,
} from "./schema"
import { mergeUnits, toUnits, type ReadingUnit } from "./units"

function getDates(input: ParsedPlanInput): IsoDate[] {
  const { startDate, activeWeekdays, pace } = input
  switch (pace.mode) {
    case "days":
      return computeActiveDates({ startDate, activeWeekdays, count: pace.days })
    case "endDate":
      return computeActiveDates({
        startDate,
        activeWeekdays,
        endDate: pace.endDate,
      })
    case "minutesPerDay":
      throw new Error("The minutes per day mode is not supported yet")
  }
}

/** Readings of each day for one track: units split into balanced groups. */
function planTrack(units: ReadingUnit[], days: number): ReadingUnit[][] {
  if (days > units.length) throw new PlanGenerationError("too_many_days")
  const ends = balancedPartition(
    units.map((unit) => unit.verses),
    days
  )
  return ends.map((end, day) => units.slice(day === 0 ? 0 : ends[day - 1], end))
}

/**
 * Builds a reading calendar: the passages are read in order, split over the
 * active days so that every day has a similar number of verses.
 *
 * Throws a ZodError for an invalid input and a PlanGenerationError when the
 * input cannot produce a plan (e.g. more days than verses).
 */
export function generatePlan(input: PlanInput): GeneratedPlan {
  const parsed = planInputSchema.parse(input)
  const dates = getDates(parsed)
  const units = toUnits(parsed.tracks[0]!.passages)
  const trackDays = planTrack(units, dates.length)

  const days: PlanDay[] = dates.map((date, index) => {
    const readings: PlanReading[] = mergeUnits(trackDays[index]!).map(
      (passage) => ({
        track: 0,
        passage,
        verses: countPassageVerses(passage),
      })
    )
    return {
      day: index + 1,
      date,
      readings,
      verses: readings.reduce((total, reading) => total + reading.verses, 0),
    }
  })

  return {
    startDate: parsed.startDate,
    endDate: dates.at(-1)!,
    days,
    totalVerses: units.reduce((total, unit) => total + unit.verses, 0),
  }
}
