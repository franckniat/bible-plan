"use server"

import { revalidatePath } from "next/cache"

import { reminderInputSchema } from "@workspace/core"
import { prisma } from "@workspace/db"
import { areEmailRemindersEnabled } from "@workspace/notifications"

import {
  createReminder,
  deleteReminder,
  setReminderEnabled,
  updateReminder,
  type ReminderError,
} from "@/server/services/reminders"
import { getVapidPublicKey } from "@/server/push-config"
import { requireUser } from "@/server/session"

/** Translated by the reminders page ("Reminders.errors.<code>"). */
export type ReminderActionError = ReminderError | "invalid" | "unexpected"

export type ReminderActionResult = { ok: true } | { error: ReminderActionError }

async function run(
  work: (
    userId: string
  ) => Promise<{ ok: true } | { ok: false; error: ReminderError }>
): Promise<ReminderActionResult> {
  const user = await requireUser()
  try {
    const result = await work(user.id)
    if (!result.ok) return { error: result.error }
  } catch (error) {
    console.error("Reminder action failed", error)
    return { error: "unexpected" }
  }
  revalidatePath("/[locale]/settings/reminders", "page")
  return { ok: true }
}

/** Creates a reminder (no id) or changes one of the signed-in user. */
export async function saveReminderAction(
  id: string | null,
  request: unknown
): Promise<ReminderActionResult> {
  const parsed = reminderInputSchema.safeParse(request)
  if (!parsed.success) return { error: "invalid" }
  const options = {
    emailEnabled: areEmailRemindersEnabled(),
    pushEnabled: getVapidPublicKey() !== null,
  }

  return run((userId) =>
    id === null
      ? createReminder(prisma, userId, parsed.data, options)
      : updateReminder(prisma, userId, id, parsed.data, options)
  )
}

export async function setReminderEnabledAction(
  id: string,
  enabled: boolean
): Promise<ReminderActionResult> {
  return run((userId) => setReminderEnabled(prisma, userId, id, enabled))
}

export async function deleteReminderAction(
  id: string
): Promise<ReminderActionResult> {
  return run((userId) => deleteReminder(prisma, userId, id))
}
