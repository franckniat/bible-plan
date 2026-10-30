import type { ReminderKind } from "@workspace/core"
import * as Notifications from "expo-notifications"
import { router, type Href } from "expo-router"
import { useEffect } from "react"
import { Platform } from "react-native"
import { createTranslator } from "use-intl"

import { phoneLocale } from "@/i18n/locale"
import { messages } from "@/i18n/provider"
import { markReading } from "@/repositories/plans"
import { prayerJournal } from "@/repositories/prayers"
import { prayerTimes } from "@/repositories/reminders"
import { currentProfile } from "@/repositories/profile"

import { rescheduleReminders } from "./schedule"

/** How long "Later" puts a reminder off. */
export const laterMinutes = 15

/** The buttons of a reminder notification, by its kind. */
export const categoryOf = (kind: ReminderKind | "PRAYER_TIME") =>
  `reminder-${kind}`

/** What a tap on a reminder or one of its buttons does. */
export type ReminderAction =
  | { type: "open"; href: string }
  | { type: "read"; readingIds: string[] }
  | { type: "prayed"; requestIds: string[] }
  | { type: "meditate" }
  | { type: "later" }
  | { type: "skip"; reminderId: string; startsAt: string }

type ReminderData = {
  kind?: unknown
  href?: unknown
  readingIds?: unknown
  requestIds?: unknown
  reminderId?: unknown
  startsAt?: unknown
}

const strings = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []

/** The action of a response to a reminder; null for another notification. */
export function reminderAction(
  actionIdentifier: string,
  data: ReminderData | undefined
): ReminderAction | null {
  if (data?.kind !== "reminder") return null
  switch (actionIdentifier) {
    case "mark-read":
      return { type: "read", readingIds: strings(data.readingIds) }
    case "prayed":
      return { type: "prayed", requestIds: strings(data.requestIds) }
    case "meditate":
      return { type: "meditate" }
    case "later":
      return { type: "later" }
    case "skip":
      return typeof data.reminderId === "string" &&
        typeof data.startsAt === "string"
        ? {
            type: "skip",
            reminderId: data.reminderId,
            startsAt: data.startsAt,
          }
        : null
    default:
      return {
        type: "open",
        href: typeof data.href === "string" ? data.href : "/today",
      }
  }
}

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

/** Does what a response asks, then removes the notification. */
async function respond(response: Notifications.NotificationResponse) {
  const { request } = response.notification
  const action = reminderAction(
    response.actionIdentifier,
    request.content.data as ReminderData
  )
  if (!action) return
  switch (action.type) {
    case "open":
      router.push(action.href as Href)
      break
    case "read":
      for (const id of action.readingIds) markReading(id, true)
      router.push("/today")
      break
    case "prayed":
      for (const id of action.requestIds) prayerJournal.prayed(id)
      router.push("/prayer")
      break
    case "meditate":
      router.push("/meditate")
      break
    case "skip":
      prayerTimes.skip(action.reminderId, new Date(action.startsAt))
      await rescheduleReminders()
      break
    case "later":
      await Notifications.scheduleNotificationAsync({
        content: {
          title: request.content.title ?? "",
          body: request.content.body ?? "",
          data: request.content.data,
          categoryIdentifier: request.content.categoryIdentifier ?? undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: laterMinutes * 60,
        },
      })
      break
  }
  await Notifications.dismissNotificationAsync(request.identifier).catch(
    () => undefined
  )
}

/** Answers taps on reminders and their buttons, also the one that opened the app. */
export function useReminderResponses() {
  useEffect(() => {
    if (Platform.OS === "web") return
    const handled = new Set<string>()
    const handle = (response: Notifications.NotificationResponse) => {
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`
      if (handled.has(key)) return
      handled.add(key)
      void respond(response).catch(() => undefined)
    }
    void Notifications.getLastNotificationResponseAsync().then(
      (response) => response && handle(response)
    )
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle)
    return () => subscription.remove()
  }, [])
}
