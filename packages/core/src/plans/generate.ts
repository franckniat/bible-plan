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

/**
 * Plan of several tracks read together, with at most `capacity` verses a
 * day in total and as few days as possible. The capacity is shared between
 * the tracks in proportion to their length (at least one verse each), so
 * they all end on the same day.
 */
function planWithinCapacity(
  tracks: ReadingUnit[][],
  capacity: number
): ReadingUnit[][][] {
  const totals = tracks.map(sumVerses)
  const total = totals.reduce((sum, verses) => sum + verses, 0)
  const capacities = totals.map((verses) =>
    Math.max(1, Math.floor((capacity * verses) / total))
  )
  const pieces = tracks.map((units, track) =>
    splitLongUnits(units, { maxVerses: capacities[track] })
  )
  const days = Math.max(
    ...pieces.map((units, track) =>
      minimalGroups(
        units.map((unit) => unit.verses),
        capacities[track]!
      )
    )
  )
  if (days > maxPlanDays) throw new PlanGenerationError("too_long")
  return pieces.map((units, track) => {
    if (totals[track]! < days) throw new PlanGenerationError("too_many_days")
    // A shorter track may need more, smaller units to fill every day.
    const filled = splitLongUnits(units, { minUnits: days })
    return partitionUnits(filled, days, capacities[track])
  })
}

/** Reading dates, and the readings of each track on each day. */
function schedule(
  input: ParsedPlanInput,
  tracks: ReadingUnit[][]
): { dates: IsoDate[]; groups: ReadingUnit[][][] } {
  const { startDate, activeWeekdays, pace } = input
  switch (pace.mode) {
    case "days":
    case "endDate": {
      const dates = computeActiveDates(
        pace.mode === "days"
          ? { startDate, activeWeekdays, count: pace.days }
          : { startDate, activeWeekdays, endDate: pace.endDate }
      )
      const groups = tracks.map((units) => planOverDays(units, dates.length))
      return { dates, groups }
    }
    case "minutesPerDay": {
      const capacity = versesForMinutes(pace.minutes, pace.readingWpm)
      const groups = planWithinCapacity(tracks, Math.max(1, capacity))
      const dates = computeActiveDates({
        startDate,
        activeWeekdays,
        count: groups[0]!.length,
      })
      return { dates, groups }
    }
  }
}

/**
 * Builds a reading calendar: the passages of each track are read in order,
 * split over the active days so that every day has a similar number of
 * verses; all tracks are read every day. With minutes per day, no day goes
 * beyond the time given (estimated from the reading speed) and the plan
 * lasts as few days as possible.
 *
 * Throws a ZodError for an invalid input and a PlanGenerationError when the
 * input cannot produce a plan (e.g. more days than verses).
 */
export function generatePlan(input: PlanInput): GeneratedPlan {
  const parsed = planInputSchema.parse(input)
  const tracks = parsed.tracks.map((track) => toUnits(track.passages))
  const { dates, groups } = schedule(parsed, tracks)

  const days: PlanDay[] = dates.map((date, index) => {
    const readings: PlanReading[] = groups.flatMap((trackDays, track) =>
      mergeUnits(trackDays[index]!).map((passage) => ({
        track,
        passage,
        verses: countPassageVerses(passage),
      }))
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
    totalVerses: tracks.flat().reduce((total, unit) => total + unit.verses, 0),
  }
}
