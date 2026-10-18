import "server-only"

import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { defaultLocale, type ReminderKind } from "@workspace/core"

import { routing } from "@/i18n/routing"
import type { ReminderText } from "@/server/services/reminder-dispatch"

/** Where each kind of reminder leads; prayer and meditation have no page yet. */
const destinations: Partial<Record<ReminderKind, string>> = {
  READING: "/today",
}

/** The in-app notification of a reminder, in the language of the person. */
export async function describeReminder(
  kind: ReminderKind,
  locale: string
): Promise<ReminderText> {
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : defaultLocale,
    namespace: "Reminders.notification",
  })
  return {
    title: t(`${kind}.title`),
    body: t(`${kind}.body`),
    href: destinations[kind],
  }
}
