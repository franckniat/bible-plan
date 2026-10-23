import "server-only"

import {
  nextReminderRun,
  type ReminderChannel,
  type ReminderKind,
  type Weekday,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

import { createNotification } from "@/server/services/notifications"
import type { ReminderContent } from "@/server/services/reminder-content"

/** How long a delivery is kept: only its recent past prevents a double send. */
export const deliveryRetentionDays = 30

/** Deletes the deliveries older than the retention period. */
export async function purgeOldDeliveries(
  db: Pick<PrismaClient, "reminderDelivery">,
  now = new Date()
): Promise<number> {
  const limit = new Date(
    now.getTime() - deliveryRetentionDays * 24 * 60 * 60 * 1000
  )
  const { count } = await db.reminderDelivery.deleteMany({
    where: { sentAt: { lt: limit } },
  })
  return count
}

export type DispatchDb = Pick<
  PrismaClient,
  "reminder" | "reminderDelivery" | "notification"
>

/** A reminder that is due, with who it is for. */
export type DueReminder = {
  id: string
  kind: ReminderKind
  /** IANA time zone the reminder is read in. */
  timezone: string
  channels: ReminderChannel[]
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    locale: string
  }
}

export type DispatchOptions = {
  now?: Date
  /** Reminders taken in one run. */
  batchSize?: number
  /** The text of the in-app notification, in the language of the person. */
  content: (reminder: DueReminder, now: Date) => Promise<ReminderContent | null>
  /**
   * Sends the reminder by email. Absent while reminders by email are off:
   * the email channel is then left alone.
   */
  sendEmail?: (reminder: DueReminder, dueAt: Date) => Promise<void>
  /**
   * Pushes the reminder to the devices of the user. Absent while push is not
   * set up (no VAPID keys): the push channel is then left alone.
   */
  sendPush?: (
    reminder: DueReminder,
    dueAt: Date,
    content: ReminderContent
  ) => Promise<void>
}

export type DispatchResult = {
  /** Due reminders found. */
  due: number
  /** Taken by this run (another one may have taken the others). */
  claimed: number
  /** Taken, but with nothing to say (a reading reminder once all is read). */
  skipped: number
  delivered: number
  failed: number
}

export const defaultBatchSize = 100

/** Prisma's error for a unique constraint: the delivery is already there. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}

/**
 * Delivers one channel of one occurrence, once: the delivery row is created
 * first and is unique per reminder, due time and channel, so a run that is
 * repeated, or two that overlap, never notifies twice.
 */
async function deliverOnce(
  db: DispatchDb,
  reminder: DueReminder,
  dueAt: Date,
  channel: ReminderChannel,
  send: () => Promise<void>
): Promise<"delivered" | "duplicate" | "failed"> {
  let deliveryId: string
  try {
    ;({ id: deliveryId } = await db.reminderDelivery.create({
      data: { reminderId: reminder.id, dueAt, channel },
      select: { id: true },
    }))
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate"
    throw error
  }

  try {
    await send()
    return "delivered"
  } catch (error) {
    console.error(`Reminder ${reminder.id}: ${channel} delivery failed`, error)
    await db.reminderDelivery.update({
      where: { id: deliveryId },
      data: { error: error instanceof Error ? error.message : String(error) },
    })
    return "failed"
  }
}

/**
 * Handles one batch of due reminders (enabled, `nextRunAt` in the past, even
 * long ago: a late run still delivers). Each is first taken by moving its
 * `nextRunAt` forward, only if nobody else has, then delivered on its
 * channels. Missed occurrences are not replayed: one notification, then the
 * next one after now.
 */
export async function dispatchDueReminders(
  db: DispatchDb,
  {
    now = new Date(),
    batchSize = defaultBatchSize,
    content: getContent,
    sendEmail,
    sendPush,
  }: DispatchOptions
): Promise<DispatchResult> {
  const due = await db.reminder.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    orderBy: { nextRunAt: "asc" },
    take: batchSize,
    select: {
      id: true,
      kind: true,
      channels: true,
      localTime: true,
      timezone: true,
      weekdays: true,
      nextRunAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          locale: true,
        },
      },
    },
  })

  const result: DispatchResult = {
    due: due.length,
    claimed: 0,
    skipped: 0,
    delivered: 0,
    failed: 0,
  }

  for (const reminder of due) {
    const dueAt = reminder.nextRunAt!
    const next = nextReminderRun(
      {
        localTime: reminder.localTime,
        timeZone: reminder.timezone,
        weekdays: reminder.weekdays as Weekday[],
      },
      now
    )

    // The lock: only the run that still sees the same `nextRunAt` takes it.
    const { count } = await db.reminder.updateMany({
      where: { id: reminder.id, enabled: true, nextRunAt: dueAt },
      data: { nextRunAt: next, lastRunAt: now },
    })
    if (count === 0) continue
    result.claimed++

    // What to say, or nothing: the occurrence is then over, without a message.
    const content = await getContent(reminder, now)
    if (content === null) {
      result.skipped++
      continue
    }

    for (const channel of reminder.channels) {
      let send: (() => Promise<void>) | null = null
      if (channel === "IN_APP") {
        send = async () => {
          await createNotification(db, {
            userId: reminder.user.id,
            type: "REMINDER",
            title: content.title,
            body: content.body,
            href: content.href,
          })
        }
      } else if (
        channel === "EMAIL" &&
        sendEmail &&
        reminder.user.emailVerified
      ) {
        send = () => sendEmail(reminder, dueAt)
      } else if (channel === "PUSH" && sendPush) {
        send = () => sendPush(reminder, dueAt, content)
      }
      // EMAIL waits for reminders by email to be on, PUSH for the VAPID keys.
      if (!send) continue

      const outcome = await deliverOnce(db, reminder, dueAt, channel, send)
      if (outcome === "delivered") result.delivered++
      if (outcome === "failed") result.failed++
    }
  }
  return result
}
