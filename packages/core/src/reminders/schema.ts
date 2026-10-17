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

/** Reminders are checked every 5 minutes, so their times are too. */
export const reminderStepMinutes = 5

/** Reminders a person can have, to keep the notifications reasonable. */
export const maxRemindersPerUser = 10

/** Reminder settings edited on the reminders page. */
export const reminderInputSchema = z.object({
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
})

export type ReminderInput = z.infer<typeof reminderInputSchema>
