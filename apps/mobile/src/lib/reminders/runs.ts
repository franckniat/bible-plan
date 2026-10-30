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
}

/** A notification to schedule: a reminder at an instant. */
export type ReminderRun = { reminderId: string; kind: ReminderKind; at: Date }

/** Days ahead scheduled at once; the app schedules again when opened. */
export const horizonDays = 7
/** iOS keeps 64 pending notifications per app: some are left for others. */
export const maxScheduled = 56

/**
 * The next runs of the enabled reminders, soonest first, over the next days
 * (nextReminderRun, as the server's cron): a local notification each.
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
      runs.push({ reminderId: reminder.id, kind: reminder.kind, at })
      at = nextReminderRun(schedule, new Date(at.getTime() + 60_000))
    }
  }
  return runs.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max)
}
