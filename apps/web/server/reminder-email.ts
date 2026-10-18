import "server-only"

import { hasLocale } from "next-intl"

import { defaultLocale } from "@workspace/core"
import {
  areEmailRemindersEnabled,
  renderReminderEmail,
  type EmailMessage,
} from "@workspace/notifications"

import { routing } from "@/i18n/routing"
import {
  reminderUnsubscribeUrl,
  unsubscribeHeaders,
} from "@/lib/reminder-token"
import { getEmailSender } from "@/server/email"
import type {
  DispatchOptions,
  DueReminder,
} from "@/server/services/reminder-dispatch"

/** The email of a due reminder: the invitation, and a way to switch it off. */
export async function buildReminderEmail(
  reminder: DueReminder,
  { baseUrl, secret }: { baseUrl: string; secret: string }
): Promise<EmailMessage> {
  const locale = hasLocale(routing.locales, reminder.user.locale)
    ? reminder.user.locale
    : defaultLocale
  const unsubscribeUrl = reminderUnsubscribeUrl(reminder.id, {
    baseUrl,
    secret,
  })
  const { subject, html, text } = await renderReminderEmail(
    reminder.kind,
    locale,
    {
      name: reminder.user.name,
      url: new URL(`/${locale}/today`, baseUrl).toString(),
      unsubscribeUrl,
    }
  )
  return {
    to: reminder.user.email,
    subject,
    html,
    text,
    category: "reminder",
    headers: unsubscribeHeaders(unsubscribeUrl),
  }
}

/**
 * How reminders are sent by email, or undefined while reminders by email are
 * off (EMAIL_REMINDERS_ENABLED): the dispatch then leaves the channel alone.
 */
export function getReminderEmailSender(): DispatchOptions["sendEmail"] {
  if (!areEmailRemindersEnabled()) return undefined

  return async (reminder) => {
    const baseUrl = process.env.BETTER_AUTH_URL
    const secret = process.env.BETTER_AUTH_SECRET
    if (!baseUrl || !secret) {
      throw new Error("BETTER_AUTH_URL and BETTER_AUTH_SECRET are required")
    }
    await getEmailSender().send(
      await buildReminderEmail(reminder, { baseUrl, secret })
    )
  }
}
