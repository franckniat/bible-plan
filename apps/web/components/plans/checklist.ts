import type { Locale } from "@workspace/core"

import type { ChecklistReading } from "@/components/plans/reading-checklist"
import type { PlanDetailDay } from "@/server/services/plans"

/** Readings of a plan day for ReadingChecklist, with their track names. */
export function toChecklist(
  day: PlanDetailDay,
  trackNames: (Record<Locale, string> | null)[],
  locale: Locale
): ChecklistReading[] {
  return day.readings.map((reading) => ({
    id: reading.id,
    passage: reading.passage,
    verses: reading.verses,
    done: reading.completedAt !== null,
    trackName:
      trackNames.length > 1
        ? (trackNames[reading.track]?.[locale] ?? null)
        : null,
  }))
}
