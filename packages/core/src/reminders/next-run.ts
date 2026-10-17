import type { TimeOfDay, Weekday } from "../schemas/common"

/** When a reminder fires: a local time, read in a time zone, on some weekdays. */
export type ReminderSchedule = {
  localTime: TimeOfDay
  /** IANA time zone, e.g. "Europe/Paris". */
  timeZone: string
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: readonly Weekday[]
}

const minute = 60_000
const day = 24 * 60 * minute

/** The wall clock of an instant in a time zone, as if it were UTC. */
function wallClock(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)!.value)
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second")
  )
}

/** Offset of a time zone from UTC at an instant (positive east of Greenwich). */
function offsetAt(instant: number, timeZone: string): number {
  // The wall clock has no milliseconds: compare with the instant to the second.
  return wallClock(instant, timeZone) - Math.floor(instant / 1000) * 1000
}

/**
 * The instant a wall-clock time (given as if UTC) happens in a time zone.
 * Around a clock change: a time that happens twice (autumn) is the first one;
 * a time that does not exist (spring) moves forward by the gap, so 02:30 on
 * the day clocks jump from 02:00 to 03:00 is 03:30.
 */
function instantOfWallClock(wall: number, timeZone: string): number {
  // The offsets in force a day before and a day after: they differ only when
  // a clock change falls in between, and each gives one candidate instant.
  const candidates = [
    ...new Set([
      wall - offsetAt(wall - day, timeZone),
      wall - offsetAt(wall + day, timeZone),
    ]),
  ]
  const exists = candidates.filter(
    (instant) => wallClock(instant, timeZone) === wall
  )
  return exists.length > 0 ? Math.min(...exists) : Math.max(...candidates)
}

/**
 * The next time a reminder fires, strictly after `after` (UTC). A reminder at
 * 7:00 in Europe/Paris stays at 7:00 on the wall clock after the change to or
 * from summer time. Null when no weekday is active.
 */
export function nextReminderRun(
  { localTime, timeZone, weekdays }: ReminderSchedule,
  after: Date = new Date()
): Date | null {
  if (weekdays.length === 0) return null
  const active = new Set<number>(weekdays)
  const [hours, minutes] = localTime.split(":").map(Number) as [number, number]

  // The calendar day of `after` where the reminder lives, then the days after.
  const today = new Date(wallClock(after.getTime(), timeZone))
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  )
  // A week is enough to meet every active weekday, one more for "today, but
  // already past" when it is the only active day.
  for (let offset = 0; offset <= 7; offset++) {
    const date = new Date(start + offset * day)
    if (!active.has(date.getUTCDay())) continue
    const instant = instantOfWallClock(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hours,
        minutes
      ),
      timeZone
    )
    if (instant > after.getTime()) return new Date(instant)
  }
  return null
}
