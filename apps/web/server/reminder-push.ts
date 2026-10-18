import "server-only"

import { hasLocale } from "next-intl"

import { defaultLocale } from "@workspace/core"
import { prisma } from "@workspace/db"
import { createPushSender } from "@workspace/notifications"

import { routing } from "@/i18n/routing"
import { pushToUser } from "@/server/services/push-devices"
import type { DispatchOptions } from "@/server/services/reminder-dispatch"

/**
 * How reminders are pushed to devices, or undefined while push is not set up
 * (no VAPID keys): the dispatch then leaves the push channel alone.
 */
export function getReminderPushSender(): DispatchOptions["sendPush"] {
  const sender = createPushSender()
  if (!sender) return undefined

  return async (reminder, _dueAt, content) => {
    const locale = hasLocale(routing.locales, reminder.user.locale)
      ? reminder.user.locale
      : defaultLocale
    // Pages are opened in the language of the person; a reminder without a
    // page of its own (prayer) leads to Today.
    const path = (href?: string) => `/${locale}${href ?? "/today"}`

    const outcome = await pushToUser(prisma, sender, reminder.user.id, {
      title: content.title,
      body: content.body,
      href: path(content.href),
      // One notification per reminder: a late one replaces the previous.
      tag: `reminder-${reminder.id}`,
      actions: content.actions?.map(({ action, title, href }) => ({
        action,
        title,
        href: path(href),
      })),
    })
    // Every device failed for a reason other than being gone: record it.
    if (outcome.sent === 0 && outcome.failed > 0) {
      throw new Error(`Push failed on ${outcome.failed} device(s)`)
    }
  }
}
