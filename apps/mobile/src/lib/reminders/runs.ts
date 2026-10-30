import {
  nextReminderRun,
  type ReminderKind,
  type TimeOfDay,
  type Weekday,
} from "@workspace/core"

/** What the scheduler needs of a reminder. */
export type ReminderTiming = {
  id: string
  kind: ReminderKind
  localTime: string
  timezone: string
  weekdays: Weekday[]
  enabled: boolean
  /** Before a prayer time, the warning. */
  leadMinutes: number
  /** A prayer time's length; null for a plain reminder. */
  durationMinutes: number | null
}

/**
 * A notification to schedule: a reminder at an instant. A prayer time has
 * two: the warning `leadMinutes` before, and its start.
 */
export type ReminderRun = {
  reminderId: string
  kind: ReminderKind
  at: Date
  prayerTime?: { phase: "warning" | "start"; minutes: number; startsAt: Date }
}

/** Days ahead scheduled at once; the app schedules again when opened. */
export const horizonDays = 7
/** iOS keeps 64 pending notifications per app: some are left for others. */
export const maxScheduled = 56

/**
 * The next runs of the enabled reminders, soonest first, over the next days
 * (nextReminderRun, as the server's cron): a local notification each, and
 * for a prayer time its warning before (prayerTimeLeadMinutes by default).
 */
export function planRuns(
  reminders: readonly ReminderTiming[],
  now: Date,
  { days = horizonDays, max = maxScheduled } = {}
): ReminderRun[] {
  const end = now.getTime() + days * 24 * 60 * 60 * 1000
  const runs: ReminderRun[] = []
  for (const reminder of reminders) {
    if (!reminder.enabled) continue
    const schedule = {
      localTime: reminder.localTime as TimeOfDay,
      timeZone: reminder.timezone,
      weekdays: reminder.weekdays,
    }
    let at = nextReminderRun(schedule, now)
    while (at && at.getTime() <= end) {
      const minutes = reminder.durationMinutes
      if (minutes === null) {
        runs.push({ reminderId: reminder.id, kind: reminder.kind, at })
      } else {
        const warning = new Date(at.getTime() - reminder.leadMinutes * 60_000)
        // A warning already past (the app opened in between) is left out.
        if (reminder.leadMinutes > 0 && warning > now) {
          runs.push({
            reminderId: reminder.id,
            kind: reminder.kind,
            at: warning,
            prayerTime: { phase: "warning", minutes, startsAt: at },
          })
        }
        runs.push({
          reminderId: reminder.id,
          kind: reminder.kind,
          at,
          prayerTime: { phase: "start", minutes, startsAt: at },
        })
      }
      at = nextReminderRun(schedule, new Date(at.getTime() + 60_000))
    }
  }
  return runs.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max)
}
