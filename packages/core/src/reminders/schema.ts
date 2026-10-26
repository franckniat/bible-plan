import { z } from "zod"

import {
  timeOfDaySchema,
  timeZoneSchema,
  weekdaysSchema,
} from "../schemas/common"

export const reminderKinds = ["READING", "PRAYER", "MEDITATION"] as const
export type ReminderKind = (typeof reminderKinds)[number]

export const reminderChannels = ["IN_APP", "PUSH", "EMAIL"] as const
export type ReminderChannel = (typeof reminderChannels)[number]

/**
 * How a prayer time takes the screen, applied by the mobile app: a
 * notification, the prayer screen with a way out (SOFT), or the prayer
 * screen until the end (STRICT).
 */
export const focusModes = ["NOTIFY", "SOFT", "STRICT"] as const
export type FocusMode = (typeof focusModes)[number]

/** The phone warns of a prayer time this many minutes before it. */
export const prayerTimeLeadMinutes = 5
export const maxLeadMinutes = 60
/** Bounds of a prayer time, in minutes. */
export const minPrayerTimeMinutes = 5
export const maxPrayerTimeMinutes = 180

/** Reminders are checked every 5 minutes, so their times are too. */
export const reminderStepMinutes = 5

/** Reminders a person can have, to keep the notifications reasonable. */
export const maxRemindersPerUser = 10

/** Reminder settings edited on the reminders page. */
export const reminderInputSchema = z
  .object({
    kind: z.enum(reminderKinds),
    localTime: timeOfDaySchema.refine(
      (time) => Number(time.slice(3)) % reminderStepMinutes === 0,
      { error: "step" }
    ),
    timeZone: timeZoneSchema,
    weekdays: weekdaysSchema,
    channels: z
      .array(z.enum(reminderChannels))
      .max(reminderChannels.length)
      // The notification centre of the app is always there.
      .transform((channels) =>
        reminderChannels.filter(
          (channel) => channel === "IN_APP" || channels.includes(channel)
        )
      ),
    enabled: z.boolean().default(true),
    leadMinutes: z.number().int().min(0).max(maxLeadMinutes).default(0),
    /** Null: a plain reminder, not a prayer time. */
    durationMinutes: z
      .number()
      .int()
      .min(minPrayerTimeMinutes)
      .max(maxPrayerTimeMinutes)
      .nullable()
      .default(null),
    focusMode: z.enum(focusModes).default("NOTIFY"),
  })
  // Only a prayer reminder can be a prayer time.
  .transform((input) =>
    input.kind === "PRAYER"
      ? input
      : {
          ...input,
          leadMinutes: 0,
          durationMinutes: null,
          focusMode: "NOTIFY" as const,
        }
  )

export type ReminderInput = z.infer<typeof reminderInputSchema>
