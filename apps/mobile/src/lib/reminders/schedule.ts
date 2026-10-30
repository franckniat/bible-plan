import { createTranslator } from "use-intl"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

import { messages } from "@/i18n/provider"
import { phoneLocale } from "@/i18n/locale"
import { reminderBook } from "@/repositories/reminders"
import { currentProfile } from "@/repositories/profile"

import { planRuns, type ReminderRun } from "./runs"

/** Marks the notifications of reminders, to replace them all at once. */
export const REMINDER = "reminder"

const native = Platform.OS !== "web"

/** Asks to notify, once; false when refused. */
export async function allowNotifications(): Promise<boolean> {
  if (!native) return false
  try {
    const { granted } = await Notifications.requestPermissionsAsync()
    return granted
  } catch {
    return false
  }
}

/** The texts of the reminders, in the app's language. */
function translator() {
  const locale = currentProfile().locale ?? phoneLocale()
  return createTranslator({
    locale,
    messages: messages[locale],
    namespace: "Reminders.notification",
  })
}

/** What a run says. */
function contentOf(run: ReminderRun, t: ReturnType<typeof translator>) {
  return {
    title: t(`${run.kind}.title`),
    body: t(`${run.kind}.body`),
    data: { kind: REMINDER, reminderId: run.reminderId, type: run.kind },
  }
}

/**
 * Replaces the scheduled reminders with the next runs of the reminders
 * (planRuns): local notifications, without any network. Called after each
 * change of a reminder, and when the app opens.
 */
export async function rescheduleReminders(now: Date = new Date()) {
  if (!native) return
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter((request) => request.content.data?.kind === REMINDER)
        .map((request) =>
          Notifications.cancelScheduledNotificationAsync(request.identifier)
        )
    )
    const { granted } = await Notifications.getPermissionsAsync()
    if (!granted) return
    const t = translator()
    for (const run of planRuns(reminderBook.all(), now)) {
      await Notifications.scheduleNotificationAsync({
        content: contentOf(run, t),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: run.at,
        },
      })
    }
  } catch {
    // Reminders are scheduled again at the next opening.
  }
}
