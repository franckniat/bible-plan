import "server-only"

import {
  maxRemindersPerUser,
  nextReminderRun,
  type ReminderInput,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type RemindersDb = Pick<PrismaClient, "reminder">

export type ReminderError = "limit" | "not_found"

export type ReminderResult<T = void> =
  { ok: true; value: T } | { ok: false; error: ReminderError }

/** Options shared by the writes: the clock, and whether emails are offered. */
type WriteOptions = {
  now?: Date
  /** Reminders by email are off unless EMAIL_REMINDERS_ENABLED is on. */
  emailEnabled?: boolean
}

/** The stored fields of a reminder: the channels the app offers, the next run. */
function toData(
  { kind, localTime, timeZone, weekdays, channels, enabled }: ReminderInput,
  { now = new Date(), emailEnabled = false }: WriteOptions
) {
  return {
    kind,
    localTime,
    timezone: timeZone,
    weekdays,
    channels: channels.filter((channel) => emailEnabled || channel !== "EMAIL"),
    enabled,
    // A disabled reminder has no next run, so the cron never picks it up.
    nextRunAt: enabled
      ? nextReminderRun({ localTime, timeZone, weekdays }, now)
      : null,
  }
}

/** The reminders of a user, by time of day. */
export async function listReminders(db: RemindersDb, userId: string) {
  return db.reminder.findMany({
    where: { userId },
    orderBy: [{ localTime: "asc" }, { createdAt: "asc" }],
  })
}

/** Creates a reminder, up to maxRemindersPerUser. */
export async function createReminder(
  db: RemindersDb,
  userId: string,
  input: ReminderInput,
  options: WriteOptions = {}
): Promise<ReminderResult<{ id: string }>> {
  const count = await db.reminder.count({ where: { userId } })
  if (count >= maxRemindersPerUser) return { ok: false, error: "limit" }

  const { id } = await db.reminder.create({
    data: { userId, ...toData(input, options) },
    select: { id: true },
  })
  return { ok: true, value: { id } }
}

/** Changes a reminder of the user and schedules its next run again. */
export async function updateReminder(
  db: RemindersDb,
  userId: string,
  reminderId: string,
  input: ReminderInput,
  options: WriteOptions = {}
): Promise<ReminderResult> {
  // updateMany, to match the owner in the same query.
  const { count } = await db.reminder.updateMany({
    where: { id: reminderId, userId },
    data: toData(input, options),
  })
  return count === 0
    ? { ok: false, error: "not_found" }
    : { ok: true, value: undefined }
}

/** Deletes a reminder of the user (its deliveries go with it). */
export async function deleteReminder(
  db: RemindersDb,
  userId: string,
  reminderId: string
): Promise<ReminderResult> {
  const { count } = await db.reminder.deleteMany({
    where: { id: reminderId, userId },
  })
  return count === 0
    ? { ok: false, error: "not_found" }
    : { ok: true, value: undefined }
}
