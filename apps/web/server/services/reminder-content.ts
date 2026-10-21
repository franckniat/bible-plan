import "server-only"

import {
  formatPassage,
  toPassageSlug,
  type Locale,
  type Passage,
  type ReminderKind,
} from "@workspace/core"
import type { PushAction } from "@workspace/notifications"

import type { TodayPlan } from "@/server/services/plans"

/** What a reminder says, in the language of the person. */
export type ReminderContent = {
  title: string
  body: string
  /** A path of the app without the language; none: Today. */
  href?: string
  /** Buttons of the push notification (their hrefs have no language either). */
  actions?: PushAction[]
}

/** Translates "Reminders.notification" messages. */
export type ContentTranslator = (
  key: string,
  values?: Record<string, string>
) => string

/** Prayer requests named in a prayer reminder, at most. */
export const maxReminderTopics = 3
/** A request title is cut to this length in a notification. */
const maxTopicLength = 40

/**
 * The requests a prayer reminder names today. `requests` are the active ones,
 * least recently prayed for first. Up to three are taken, and each day starts
 * three further along the list, so the reminder does not repeat itself day
 * after day (even for someone who has not marked anything as prayed).
 */
export function pickReminderTopics(
  requests: readonly string[],
  dayNumber: number
): string[] {
  const count = requests.length
  if (count <= maxReminderTopics) return [...requests]
  const start = (((dayNumber * maxReminderTopics) % count) + count) % count
  return Array.from(
    { length: maxReminderTopics },
    (_, index) => requests[(start + index) % count]!
  )
}

/** A title short enough for a notification. */
function shortTopic(title: string): string {
  const text = title.trim().replace(/\s+/g, " ")
  return text.length <= maxTopicLength
    ? text
    : `${text.slice(0, maxTopicLength - 1).trimEnd()}…`
}

/** The reading left to do today in the plans, with where to read it. */
export type RemainingReading = { id: string; passage: Passage }

/**
 * The readings of today that are not read yet, over every active plan.
 * Readings planned before today (late ones) are the catch-up's business, not
 * today's.
 */
export function remainingReadings(
  plans: readonly TodayPlan[]
): RemainingReading[] {
  return plans.flatMap((plan) =>
    plan.isToday && plan.day
      ? plan.day.readings
          .filter((reading) => reading.completedAt === null)
          .map(({ id, passage }) => ({ id, passage }))
      : []
  )
}

/**
 * The text of a reminder, or null when there is nothing to remind of: a
 * reading reminder is skipped once everything planned today is read.
 *
 * - reading: the passages left today, a link to the first one (marked as
 *   read from the reader) and a button to Today;
 * - meditation: the verse of the day, with a link to it;
 * - prayer: the requests of the journal to pray for today (one to three,
 *   a different set each day), or a plain invitation without any.
 */
export function reminderContent({
  kind,
  locale,
  plans,
  verse,
  topics = [],
  t,
}: {
  kind: ReminderKind
  locale: Locale
  /** The active plans with today's readings (reading reminders). */
  plans: readonly TodayPlan[]
  /** The verse of the day (meditation reminders). */
  verse: Passage | null
  /** The prayer requests picked for today (prayer reminders). */
  topics?: readonly string[]
  t: ContentTranslator
}): ReminderContent | null {
  const title = t(`${kind}.title`)

  if (kind === "READING") {
    const left = remainingReadings(plans)
    // Plans, and nothing left to read in them today: no reminder.
    if (plans.length > 0 && left.length === 0) return null
    if (left.length === 0)
      return { title, body: t("READING.body"), href: "/today" }

    const passages = new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction",
    }).format(left.map(({ passage }) => formatPassage(passage, locale)))
    const first = left[0]!
    return {
      title,
      body: t("READING.bodyWith", { passages }),
      href: `/read/${toPassageSlug(first.passage)}?reading=${first.id}`,
      actions: [
        { action: "today", title: t("READING.action"), href: "/today" },
      ],
    }
  }

  if (kind === "MEDITATION" && verse) {
    return {
      title,
      body: t("MEDITATION.bodyWith", {
        reference: formatPassage(verse, locale),
      }),
      href: `/read/${toPassageSlug(verse)}`,
    }
  }

  if (kind === "PRAYER") {
    const named = topics.slice(0, maxReminderTopics).map(shortTopic)
    if (named.length > 0) {
      const list = new Intl.ListFormat(locale, {
        style: "long",
        type: "conjunction",
      }).format(named)
      return { title, body: t("PRAYER.bodyWith", { topics: list }), href: "/prayer" }
    }
    return { title, body: t("PRAYER.body"), href: "/prayer" }
  }

  return { title, body: t(`${kind}.body`) }
}
