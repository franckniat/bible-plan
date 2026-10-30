import {
  daysBetween,
  findVerseOfTheDay,
  getToday,
  pickReminderTopics,
  reminderContent,
  type ContentTranslator,
  type Locale,
} from "@workspace/core"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import { createTranslator } from "use-intl"

import { messages } from "@/i18n/provider"
import { phoneLocale } from "@/i18n/locale"
import { plansOn } from "@/repositories/plans"
import { activePrayerTitles } from "@/repositories/prayers"
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

/** The language of the app, and its texts of the reminders. */
function translator() {
  const locale = currentProfile().locale ?? phoneLocale()
  const t = createTranslator({
    locale,
    messages: messages[locale],
    namespace: "Reminders.notification",
  })
  // Keys are built from the kind; the messages are checked by their tests.
  return { locale, t: t as unknown as ContentTranslator }
}

/**
 * What a run says, as the server's reminders (reminderContent), for the day
 * it fires: the readings left in the plans, the verse of the day, prayer
 * requests of the journal. Null when there is nothing to remind of.
 */
export function contentOf(
  run: ReminderRun,
  timeZone: string,
  locale: Locale,
  t: ContentTranslator
) {
  const day = getToday(timeZone, run.at)
  const content = reminderContent({
    kind: run.kind,
    locale,
    plans: run.kind === "READING" ? plansOn(day) : [],
    verse: run.kind === "MEDITATION" ? findVerseOfTheDay(day, locale) : null,
    topics:
      run.kind === "PRAYER"
        ? pickReminderTopics(
            activePrayerTitles(),
            daysBetween("1970-01-01", day)
          )
        : [],
    t,
  })
  if (!content) return null
  return {
    title: content.title,
    body: content.body,
    data: {
      kind: REMINDER,
      reminderId: run.reminderId,
      type: run.kind,
      href: content.href ?? "/today",
    },
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
    const { locale, t } = translator()
    const reminders = reminderBook.all()
    const zones = new Map(reminders.map((item) => [item.id, item.timezone]))
    for (const run of planRuns(reminders, now)) {
      const content = contentOf(run, zones.get(run.reminderId)!, locale, t)
      if (!content) continue
      await Notifications.scheduleNotificationAsync({
        content,
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
