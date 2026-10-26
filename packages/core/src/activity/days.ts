import { getToday } from "../plans/dates"
import type { IsoDate } from "../schemas/common"

/** Something a person did that counts in their activity. */
export type ActivityEvent =
  /** A reading ticked off (its progress, while it exists). */
  | { type: "reading"; at: Date }
  /** "I prayed" on a prayer request. */
  | { type: "prayer"; at: Date }
  /** A timed session: a time of prayer counts as a prayer too. */
  | {
      type: "session"
      kind: "MEDITATION" | "PRAYER"
      seconds: number
      at: Date
    }

/** What a person did on a day of their own calendar. */
export type ActivityDayTotals = {
  day: IsoDate
  readings: number
  prayers: number
  meditationSeconds: number
  prayerSeconds: number
}

/**
 * The activity of each day, computed from the events themselves rather
 * than added up as they happen: the same events give the same days on the
 * server and on the phone, in any order, so two devices never disagree.
 * Days are those of `timeZone`; only days with something done are listed,
 * in date order.
 */
export function computeActivityDays(
  events: Iterable<ActivityEvent>,
  timeZone: string | null | undefined
): ActivityDayTotals[] {
  const days = new Map<IsoDate, ActivityDayTotals>()
  for (const event of events) {
    const day = getToday(timeZone, event.at)
    let totals = days.get(day)
    if (!totals) {
      totals = {
        day,
        readings: 0,
        prayers: 0,
        meditationSeconds: 0,
        prayerSeconds: 0,
      }
      days.set(day, totals)
    }
    if (event.type === "reading") totals.readings += 1
    else if (event.type === "prayer") totals.prayers += 1
    else if (event.kind === "PRAYER") {
      totals.prayers += 1
      totals.prayerSeconds += Math.max(0, event.seconds)
    } else totals.meditationSeconds += Math.max(0, event.seconds)
  }
  return [...days.values()]
    .filter(
      (totals) =>
        totals.readings > 0 ||
        totals.prayers > 0 ||
        totals.meditationSeconds > 0 ||
        totals.prayerSeconds > 0
    )
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
}
