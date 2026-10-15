import { countPassageVerses, versesForMinutes } from "../bible/weight"
import type { IsoDate } from "../schemas/common"
import { computeActiveDates } from "./dates"
import { balancedPartition, minimalGroups } from "./partition"
import {
  maxPlanDays,
  planInputSchema,
  PlanGenerationError,
  type GeneratedPlan,
  type ParsedPlanInput,
  type PlanDay,
  type PlanInput,
  type PlanReading,
} from "./schema"
import { mergeUnits, splitLongUnits, toUnits, type ReadingUnit } from "./units"

/** A chapter longer than this many times the daily average is cut. */
const LONG_UNIT_FACTOR = 2

const sumVerses = (units: readonly ReadingUnit[]) =>
  units.reduce((total, unit) => total + unit.verses, 0)

/** Splits units into `days` balanced groups, each within `maxLoad` verses. */
function partitionUnits(
  units: ReadingUnit[],
  days: number,
  maxLoad?: number
): ReadingUnit[][] {
  const ends = balancedPartition(
    units.map((unit) => unit.verses),
    days,
    maxLoad
  )
  return ends.map((end, day) => units.slice(day === 0 ? 0 : ends[day - 1], end))
}

/** Plan with a fixed number of days: each day near the average. */
function planOverDays(units: ReadingUnit[], days: number): ReadingUnit[][] {
  const verses = sumVerses(units)
  if (days > verses) throw new PlanGenerationError("too_many_days")
  const pieces = splitLongUnits(units, {
    maxVerses: Math.ceil((LONG_UNIT_FACTOR * verses) / days),
    minUnits: days,
  })
  return partitionUnits(pieces, days)
}

/** Plan with at most `capacity` verses a day, in as few days as possible. */
function planWithinCapacity(
  units: ReadingUnit[],
  capacity: number
): ReadingUnit[][] {
  const pieces = splitLongUnits(units, { maxVerses: capacity })
  const days = minimalGroups(
    pieces.map((piece) => piece.verses),
    capacity
  )
  if (days > maxPlanDays) throw new PlanGenerationError("too_long")
  return partitionUnits(pieces, days, capacity)
}

/** Readings of each day, and the reading dates. */
function schedule(
  input: ParsedPlanInput,
  units: ReadingUnit[]
): { dates: IsoDate[]; groups: ReadingUnit[][] } {
  const { startDate, activeWeekdays, pace } = input
  switch (pace.mode) {
    case "days": {
      const dates = computeActiveDates({
        startDate,
        activeWeekdays,
        count: pace.days,
      })
      return { dates, groups: planOverDays(units, dates.length) }
    }
    case "endDate": {
      const dates = computeActiveDates({
        startDate,
        activeWeekdays,
        endDate: pace.endDate,
      })
      return { dates, groups: planOverDays(units, dates.length) }
    }
    case "minutesPerDay": {
      const capacity = versesForMinutes(pace.minutes, pace.readingWpm)
      const groups = planWithinCapacity(units, Math.max(1, capacity))
      const dates = computeActiveDates({
        startDate,
        activeWeekdays,
        count: groups.length,
      })
      return { dates, groups }
    }
  }
}

/**
 * Builds a reading calendar: the passages are read in order, split over the
 * active days so that every day has a similar number of verses. With
 * minutes per day, no day goes beyond the time given (estimated from the
 * reading speed) and the plan lasts as few days as possible.
 *
 * Throws a ZodError for an invalid input and a PlanGenerationError when the
 * input cannot produce a plan (e.g. more days than verses).
 */
export function generatePlan(input: PlanInput): GeneratedPlan {
  const parsed = planInputSchema.parse(input)
  const units = toUnits(parsed.tracks[0]!.passages)
  const { dates, groups } = schedule(parsed, units)

  const days: PlanDay[] = dates.map((date, index) => {
    const readings: PlanReading[] = mergeUnits(groups[index]!).map(
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
    totalVerses: sumVerses(units),
  }
}
