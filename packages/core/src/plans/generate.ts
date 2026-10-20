import { countPassageVerses, versesForMinutes } from "../bible/weight"
import type { IsoDate } from "../schemas/common"
import { computeActiveDates } from "./dates"
import { balancedPartition } from "./partition"
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

/** Splits units into `days` balanced groups. */
function partitionUnits(units: ReadingUnit[], days: number): ReadingUnit[][] {
  const ends = balancedPartition(
    units.map((unit) => unit.verses),
    days
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
    case "chaptersPerDay": {
      // The same number of chapters every day, in every track; the plan lasts
      // as long as the longest track needs. A chapter is one unit (a part of
      // a chapter counts as one, so only passages made of whole chapters give
      // exactly the number asked for).
      const days = Math.max(
        ...tracks.map((units) => Math.ceil(units.length / pace.chapters))
      )
      if (days > maxPlanDays) throw new PlanGenerationError("too_long")
      const dates = computeActiveDates({
        startDate,
        activeWeekdays,
        count: days,
      })
      const groups = tracks.map((units) =>
        Array.from({ length: Math.ceil(units.length / pace.chapters) }, (_, day) =>
          units.slice(day * pace.chapters, (day + 1) * pace.chapters)
        )
      )
      return { dates, groups }
    }
    case "minutesPerDay": {
      // The time is a guide to size the plan, not a daily limit: the plan
      // lasts as many days as the average day needs to fit in it.
      const perDay = Math.max(
        1,
        versesForMinutes(pace.minutes, pace.readingWpm)
      )
      const total = tracks.reduce((sum, units) => sum + sumVerses(units), 0)
      const days = Math.ceil(total / perDay)
      if (days > maxPlanDays) throw new PlanGenerationError("too_long")
      const dates = computeActiveDates({
        startDate,
        activeWeekdays,
        count: days,
      })
      return { dates, groups: tracks.map((units) => planOverDays(units, days)) }
    }
  }
}

/**
 * Builds a reading calendar: the passages of each track are read in order,
 * split over the active days so that every day has a similar number of
 * verses; all tracks are read every day. With minutes per day, an average
 * day takes about that time (estimated from the reading speed): it sizes
 * the plan, it is not a limit.
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
      // A shorter track is over before the others: nothing to read on its side.
      mergeUnits(trackDays[index] ?? []).map((passage) => ({
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
