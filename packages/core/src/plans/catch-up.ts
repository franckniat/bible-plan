import type { Passage } from "../bible/passage"
import type { IsoDate, Weekday } from "../schemas/common"
import { computeActiveDates } from "./dates"
import { generatePlan } from "./generate"
import { PlanGenerationError } from "./schema"

/**
 * What to do when readings are late:
 * - REDISTRIBUTE spreads the unread readings over the remaining days and
 *   keeps the end date (days get a little longer);
 * - SHIFT moves the remaining days later and keeps the daily load (the end
 *   date moves);
 * - FREE changes nothing: late readings are read whenever the reader likes.
 */
export const catchUpStrategies = ["SHIFT", "REDISTRIBUTE", "FREE"] as const
export type CatchUpStrategy = (typeof catchUpStrategies)[number]

/** A reading of a stored plan, with the reader's progress. */
export type ScheduleReading = {
  id: string
  track: number
  passage: Passage
  verses: number
  done: boolean
}

/** A day of a stored plan, in order. */
export type ScheduleDay = {
  id: string
  date: IsoDate
  readings: ScheduleReading[]
}

/** A reading to create when catching up. */
export type NewReading = { track: number; passage: Passage; verses: number }

/**
 * Changes that bring a plan back on schedule. Readings already read are
 * never removed nor moved to another day: progress is always kept.
 */
export type CatchUpChanges = {
  /** Days that keep their readings but get a new date. */
  moveDays: { dayId: string; date: IsoDate }[]
  /** Unread readings removed from their day (read again later). */
  removeReadings: string[]
  /** Readings to add, grouped by date. */
  addDays: { date: IsoDate; readings: NewReading[] }[]
  /** Date of the last reading day afterwards. */
  endDate: IsoDate
}

/** Unread readings planned before `today`. */
export function getOverdueReadings(
  days: readonly ScheduleDay[],
  today: IsoDate
): ScheduleReading[] {
  return days
    .filter((day) => day.date < today)
    .flatMap((day) => day.readings.filter((reading) => !reading.done))
}

type CatchUpOptions = {
  days: readonly ScheduleDay[]
  today: IsoDate
  activeWeekdays: readonly Weekday[]
}

/** SHIFT: from the first late day on, days follow each other from today. */
function shift({
  days,
  today,
  activeWeekdays,
}: CatchUpOptions): CatchUpChanges {
  const first = days.findIndex(
    (day) => day.date < today && day.readings.some((reading) => !reading.done)
  )
  const moved = days.slice(first)
  const dates = computeActiveDates({
    startDate: today,
    activeWeekdays,
    count: moved.length,
  })
  return {
    // Only days whose date changes.
    moveDays: moved.flatMap((day, index) =>
      day.date === dates[index] ? [] : [{ dayId: day.id, date: dates[index]! }]
    ),
    removeReadings: [],
    addDays: [],
    endDate: dates.at(-1)!,
  }
}

/**
 * REDISTRIBUTE: unread readings, late or to come, are spread again over the
 * active days from today to the end date, each track on its own.
 */
function redistribute(
  { days, today, activeWeekdays }: CatchUpOptions,
  endDate: IsoDate
): CatchUpChanges {
  const dates =
    endDate >= today
      ? computeActiveDates({ startDate: today, activeWeekdays, endDate })
      : []
  if (dates.length === 0) throw new PlanGenerationError("no_active_days")

  const unread = days.flatMap((day) =>
    day.readings.filter((reading) => !reading.done)
  )
  const tracks = [...new Set(unread.map((reading) => reading.track))].sort(
    (a, b) => a - b
  )
  const byDate = new Map<IsoDate, NewReading[]>()

  for (const track of tracks) {
    const passages = unread
      .filter((reading) => reading.track === track)
      .map((reading) => reading.passage)
    const verses = unread
      .filter((reading) => reading.track === track)
      .reduce((total, reading) => total + reading.verses, 0)
    // A track with little left ends earlier rather than splitting verses.
    const plan = generatePlan({
      tracks: [{ passages }],
      startDate: today,
      activeWeekdays: [...activeWeekdays],
      pace: { mode: "days", days: Math.min(dates.length, verses) },
    })
    for (const day of plan.days) {
      const readings = byDate.get(day.date) ?? []
      readings.push(...day.readings.map((reading) => ({ ...reading, track })))
      byDate.set(day.date, readings)
    }
  }

  const addDays = [...byDate]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, readings]) => ({ date, readings }))
  const lastRead = days
    .filter((day) => day.readings.some((reading) => reading.done))
    .at(-1)?.date
  const lastNew = addDays.at(-1)?.date
  return {
    moveDays: [],
    removeReadings: unread.map((reading) => reading.id),
    addDays,
    endDate: [lastNew, lastRead].filter(Boolean).sort().at(-1) ?? today,
  }
}

/**
 * Changes that bring a plan back on schedule with a strategy, or null when
 * nothing needs to change (no late reading, or FREE).
 *
 * Throws a PlanGenerationError("no_active_days") when REDISTRIBUTE has no
 * day left before the end date.
 */
export function planCatchUp(
  strategy: CatchUpStrategy,
  options: CatchUpOptions & { endDate: IsoDate }
): CatchUpChanges | null {
  if (strategy === "FREE") return null
  if (getOverdueReadings(options.days, options.today).length === 0) return null
  return strategy === "SHIFT"
    ? shift(options)
    : redistribute(options, options.endDate)
}

/** A day of a plan once caught up, in date order. */
export type RebuiltDay = {
  id: string
  date: IsoDate
  /** 1 for the first day, in date order. */
  dayNumber: number
  /** Verses of its readings. */
  verses: number
  /** A day created by the catch-up. */
  created: boolean
  /** In reading order: the day's own readings, then the added ones. */
  readings: (ScheduleReading & { created: boolean })[]
}

/** A plan's schedule after a catch-up. */
export type RebuiltSchedule = {
  days: RebuiltDay[]
  /** Days left without readings, to delete. */
  removedDayIds: string[]
  endDate: IsoDate
  totalDays: number
  totalReadings: number
}

/**
 * The schedule of a plan once `changes` are applied, as the server stores
 * it and as the phone rebuilds it offline. Read readings always stay where
 * they are; added readings join the day already on their date or a new day;
 * days left empty go and the others are numbered again in date order.
 * `newId` makes the ids of new days and readings (UUIDv7 on the phone).
 */
export function rebuildSchedule(
  days: readonly ScheduleDay[],
  changes: CatchUpChanges,
  newId: () => string
): RebuiltSchedule {
  const removed = new Set(changes.removeReadings)
  const movedTo = new Map(
    changes.moveDays.map((move) => [move.dayId, move.date])
  )

  const rebuilt: Omit<RebuiltDay, "dayNumber" | "verses">[] = days.map(
    (day) => ({
      id: day.id,
      date: movedTo.get(day.id) ?? day.date,
      created: false,
      readings: day.readings
        // A read reading is never removed, whatever the changes say.
        .filter((reading) => reading.done || !removed.has(reading.id))
        .map((reading) => ({ ...reading, created: false })),
    })
  )
  // New readings join the first day on their date.
  const dayOfDate = new Map<IsoDate, (typeof rebuilt)[number]>()
  for (const day of rebuilt) {
    if (!dayOfDate.has(day.date)) dayOfDate.set(day.date, day)
  }
  for (const { date, readings } of changes.addDays) {
    let day = dayOfDate.get(date)
    if (!day) {
      day = { id: newId(), date, created: true, readings: [] }
      rebuilt.push(day)
      dayOfDate.set(date, day)
    }
    day.readings.push(
      ...readings.map((reading) => ({
        ...reading,
        id: newId(),
        done: false,
        created: true,
      }))
    )
  }

  const kept = rebuilt.filter((day) => day.readings.length > 0)
  // Stable: days on the same date keep their order, as on the server.
  kept.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const result = kept.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
    verses: day.readings.reduce((total, reading) => total + reading.verses, 0),
  }))
  return {
    days: result,
    removedDayIds: rebuilt
      .filter((day) => day.readings.length === 0 && !day.created)
      .map((day) => day.id),
    endDate: result.at(-1)?.date ?? changes.endDate,
    totalDays: result.length,
    totalReadings: result.reduce(
      (total, day) => total + day.readings.length,
      0
    ),
  }
}
