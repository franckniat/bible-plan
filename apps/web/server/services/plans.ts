import "server-only"

import { randomUUID } from "node:crypto"

import {
  generatePlan,
  resolveNewPlan,
  type IsoDate,
  type Locale,
  type ParsedNewPlan,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type PlansDb = Pick<
  PrismaClient,
  | "$transaction"
  | "readingPlan"
  | "planDay"
  | "planReading"
  | "planEnrollment"
  | "readingProgress"
>

/** A calendar date stored in a DATE column (midnight UTC). */
export function toDbDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

export function fromDbDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

/** A one-year plan has about 400 to 1,500 readings: allow a slow network. */
const CREATE_TIMEOUT_MS = 20_000

/**
 * Generates a plan and stores it, with its days and readings, in a single
 * transaction (4 queries whatever its length), then enrolls its owner.
 * Throws a PlanGenerationError when the request cannot produce a plan.
 */
export async function createPlan(
  db: PlansDb,
  userId: string,
  request: ParsedNewPlan,
  locale: Locale
): Promise<{ id: string }> {
  const { title, templateKey, tracks, input } = resolveNewPlan(request, locale)
  const generated = generatePlan(input)
  const planId = randomUUID()

  const days = generated.days.map((day) => ({ ...day, id: randomUUID() }))
  const dayRows = days.map((day) => ({
    id: day.id,
    planId,
    dayNumber: day.day,
    date: toDbDate(day.date),
    verses: day.verses,
  }))
  const readingRows = days.flatMap((day) =>
    day.readings.map(({ track, passage, verses }, position) => ({
      dayId: day.id,
      position,
      track,
      book: passage.book,
      startChapter: passage.start.chapter,
      startVerse: passage.start.verse,
      endChapter: passage.end.chapter,
      endVerse: passage.end.verse,
      verses,
    }))
  )

  await db.$transaction(
    async (tx) => {
      await tx.readingPlan.create({
        data: {
          id: planId,
          ownerId: userId,
          title,
          templateKey,
          startDate: toDbDate(generated.startDate),
          endDate: toDbDate(generated.endDate),
          activeWeekdays: input.activeWeekdays ?? [0, 1, 2, 3, 4, 5, 6],
          tracks,
          pace: input.pace,
          totalDays: generated.days.length,
          totalVerses: generated.totalVerses,
        },
      })
      await tx.planDay.createMany({ data: dayRows })
      await tx.planReading.createMany({ data: readingRows })
      await tx.planEnrollment.create({ data: { planId, userId } })
    },
    { timeout: CREATE_TIMEOUT_MS }
  )
  return { id: planId }
}
