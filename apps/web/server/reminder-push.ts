import "server-only"

import { prisma } from "@workspace/db"
import { createPushSender } from "@workspace/notifications"

import { describeReminder } from "@/server/reminder-text"
import { pushToUser } from "@/server/services/push-devices"
import type { DispatchOptions } from "@/server/services/reminder-dispatch"

/**
 * How reminders are pushed to devices, or undefined while push is not set up
 * (no VAPID keys): the dispatch then leaves the push channel alone.
 */
export function getReminderPushSender(): DispatchOptions["sendPush"] {
  const sender = createPushSender()
  if (!sender) return undefined

  return async (reminder) => {
    const locale = reminder.user.locale === "en" ? "en" : "fr"
    const text = await describeReminder(reminder.kind, locale)
    const outcome = await pushToUser(prisma, sender, reminder.user.id, {
      title: text.title,
      body: text.body ?? "",
      // The page is opened in the language of the person; without a page of
      // its own (prayer, meditation) the reminder leads to Today.
      href: `/${locale}${text.href ?? "/today"}`,
      // One notification per reminder: a late one replaces the previous.
      tag: `reminder-${reminder.id}`,
    })
    // Every device failed for a reason other than being gone: record it.
    if (outcome.sent === 0 && outcome.failed > 0) {
      throw new Error(`Push failed on ${outcome.failed} device(s)`)
    }
  }
}
