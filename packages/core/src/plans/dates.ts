import type { IsoDate, Weekday } from "../schemas/common"
import { maxPlanDays, PlanGenerationError } from "./schema"

// Calendar dates are computed in UTC so the result never depends on the time
// zone of the machine.
const DAY_MS = 24 * 60 * 60 * 1000

function toTime(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number)
  return Date.UTC(year!, month! - 1, day!)
}

function fromTime(time: number): IsoDate {
  return new Date(time).toISOString().slice(0, 10)
}

/** The date `days` days after (or before, if negative) `date`. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fromTime(toTime(date) + days * DAY_MS)
}

/** Day of the week of a date, 0 = Sunday. */
export function getWeekday(date: IsoDate): Weekday {
  return new Date(toTime(date)).getUTCDay() as Weekday
}

/** Number of days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS)
}

type ActiveDatesOptions = {
  startDate: IsoDate
  activeWeekdays: readonly Weekday[]
} & ({ count: number } | { endDate: IsoDate })

/**
 * Reading dates from the start date, on active weekdays only: the first
 * `count` of them, or all of them up to `endDate` (included).
 */
export function computeActiveDates(options: ActiveDatesOptions): IsoDate[] {
  const { startDate, activeWeekdays } = options
  const active = new Set(activeWeekdays)
  if (active.size === 0) throw new PlanGenerationError("no_active_days")

  const dates: IsoDate[] = []
  if ("count" in options) {
    for (let date = startDate; dates.length < options.count;) {
      if (active.has(getWeekday(date))) dates.push(date)
      date = addDays(date, 1)
    }
    return dates
  }

  const span = daysBetween(startDate, options.endDate) + 1
  if (span > maxPlanDays) throw new PlanGenerationError("too_long")
  for (let offset = 0; offset < span; offset++) {
    const date = addDays(startDate, offset)
    if (active.has(getWeekday(date))) dates.push(date)
  }
  if (dates.length === 0) throw new PlanGenerationError("no_active_days")
  return dates
}
