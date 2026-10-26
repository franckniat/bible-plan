import "server-only"

import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import {
  daysBetween,
  defaultLocale,
  getToday,
  pickReminderTopics,
  reminderContent,
  type ContentTranslator,
  type ReminderContent,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { routing } from "@/i18n/routing"
import { findVerseOfTheDay } from "@/lib/verse-of-the-day"
import { getTodayPlans } from "@/server/services/plans"
import { listPrayerTitles } from "@/server/services/prayers"
import type { DueReminder } from "@/server/services/reminder-dispatch"

/**
 * What a due reminder says, in the language and the day of its owner: the
 * readings left for a reading reminder (null once they are all read), the
 * verse of the day for a meditation reminder.
 */
export async function getReminderContent(
  reminder: DueReminder,
  now: Date
): Promise<ReminderContent | null> {
  const locale = hasLocale(routing.locales, reminder.user.locale)
    ? reminder.user.locale
    : defaultLocale
  const t = await getTranslations({
    locale,
    namespace: "Reminders.notification",
  })
  // "Today" is the day of the person, where the reminder is read.
  const today = getToday(reminder.timezone, now)

  return reminderContent({
    kind: reminder.kind,
    locale,
    plans:
      reminder.kind === "READING"
        ? await getTodayPlans(prisma, reminder.user.id, today)
        : [],
    verse:
      reminder.kind === "MEDITATION" ? findVerseOfTheDay(today, locale) : null,
    topics:
      reminder.kind === "PRAYER"
        ? pickReminderTopics(
            await listPrayerTitles(prisma, reminder.user.id),
            daysBetween("1970-01-01", today)
          )
        : [],
    // Keys are built from the kind; the messages are checked by their tests.
    t: t as unknown as ContentTranslator,
  })
}
