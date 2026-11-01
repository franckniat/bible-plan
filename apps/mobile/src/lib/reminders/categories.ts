import type { ReminderKind } from "@workspace/core"
import * as Notifications from "expo-notifications"
import { createTranslator } from "use-intl"

import { phoneLocale } from "@/i18n/locale"
import { messages } from "@/i18n/provider"
import { currentProfile } from "@/repositories/profile"

/** The buttons of a reminder notification, by its kind. */
export const categoryOf = (kind: ReminderKind | "PRAYER_TIME") =>
  `reminder-${kind}`

/**
 * Declares the buttons of the reminders, in the app's language: "Mark as
 * read" and "Later" on a reading reminder, "Meditate now" on a meditation
 * one, "I prayed" on a prayer one. They open the app, which acts on them.
 */
export async function defineReminderActions() {
  const locale = currentProfile().locale ?? phoneLocale()
  const t = createTranslator({ locale, messages: messages[locale] })
  const button = (identifier: string, buttonTitle: string) => ({
    identifier,
    buttonTitle,
    options: { opensAppToForeground: true },
  })
  const later = button("later", t("Reminders.suggest.later"))
  await Promise.all([
    Notifications.setNotificationCategoryAsync(categoryOf("READING"), [
      button("mark-read", t("Reader.reading.markDone")),
      later,
    ]),
    Notifications.setNotificationCategoryAsync(categoryOf("MEDITATION"), [
      button("meditate", t("Mobile.reminders.meditateNow")),
      later,
    ]),
    Notifications.setNotificationCategoryAsync(categoryOf("PRAYER"), [
      button("prayed", t("Prayer.prayed")),
      later,
    ]),
    // A prayer time can be skipped, from its warning or its start.
    Notifications.setNotificationCategoryAsync(categoryOf("PRAYER_TIME"), [
      button("skip", t("Mobile.prayerTime.skipShort")),
    ]),
  ])
}
