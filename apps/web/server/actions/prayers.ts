"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getToday,
  prayerAnswerInputSchema,
  prayerRequestInputSchema,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { recordActivity } from "@/server/services/activity"
import { canShareWith } from "@/server/services/group-prayers"
import {
  createPrayer,
  deletePrayer,
  markAnswered,
  markPrayed,
  setPrayerStatus,
  updateAnswer,
  updatePrayer,
  type PrayerError,
} from "@/server/services/prayers"
import { requireUser } from "@/server/session"

/** Translated by the prayer journal ("Prayer.errors.<code>"). */
export type PrayerActionError = PrayerError | "invalid" | "unexpected"

export type PrayerActionResult = { ok: true } | { error: PrayerActionError }

const idSchema = z.uuid()

async function run(
  work: (
    userId: string
  ) => Promise<{ ok: true } | { ok: false; error: PrayerError }>
): Promise<PrayerActionResult> {
  const user = await requireUser()
  try {
    const result = await work(user.id)
    if (!result.ok) return { error: result.error }
  } catch (error) {
    console.error("Prayer action failed", error)
    return { error: "unexpected" }
  }
  revalidatePath("/[locale]/prayer", "page")
  return { ok: true }
}

/** Creates a prayer request (no id) or changes one of the signed-in user. */
export async function savePrayerAction(
  id: string | null,
  request: unknown
): Promise<PrayerActionResult> {
  const parsed = prayerRequestInputSchema.safeParse(request)
  const validId = id === null || idSchema.safeParse(id).success
  if (!parsed.success || !validId) return { error: "invalid" }
  const user = await requireUser()
  const today = getToday(user.timezone)
  // A request is only shared with a group the person is in.
  const groupId = parsed.data.groupId
  if (groupId && !(await canShareWith(prisma, user.id, groupId))) {
    return { error: "notFound" }
  }
  return run((userId) =>
    id === null
      ? createPrayer(prisma, userId, parsed.data, today)
      : updatePrayer(prisma, userId, id, parsed.data)
  )
}

export async function prayedAction(id: string): Promise<PrayerActionResult> {
  if (!idSchema.safeParse(id).success) return { error: "invalid" }
  const user = await requireUser()
  const result = await run((userId) => markPrayed(prisma, userId, id))
  // A prayer counts for the streak, in the day of the user. The prayer is
  // already saved: a failure here only costs the count.
  if ("ok" in result) {
    await recordActivity(prisma, user.id, getToday(user.timezone), {
      prayers: 1,
    }).catch((error) => console.error("Recording activity failed", error))
  }
  return result
}

export async function answeredAction(
  id: string,
  request: unknown
): Promise<PrayerActionResult> {
  const parsed = prayerAnswerInputSchema.safeParse(request)
  if (!parsed.success || !idSchema.safeParse(id).success) {
    return { error: "invalid" }
  }
  const today = getToday((await requireUser()).timezone)
  return run((userId) => markAnswered(prisma, userId, id, parsed.data, today))
}

/** Changes the day and the circumstances of an answered request. */
export async function updateAnswerAction(
  id: string,
  request: unknown
): Promise<PrayerActionResult> {
  const parsed = prayerAnswerInputSchema.safeParse(request)
  if (!parsed.success || !idSchema.safeParse(id).success) {
    return { error: "invalid" }
  }
  return run((userId) => updateAnswer(prisma, userId, id, parsed.data))
}

export async function setPrayerStatusAction(
  id: string,
  status: "ACTIVE" | "ARCHIVED"
): Promise<PrayerActionResult> {
  if (!idSchema.safeParse(id).success) return { error: "invalid" }
  if (status !== "ACTIVE" && status !== "ARCHIVED") return { error: "invalid" }
  return run((userId) => setPrayerStatus(prisma, userId, id, status))
}

export async function deletePrayerAction(
  id: string
): Promise<PrayerActionResult> {
  if (!idSchema.safeParse(id).success) return { error: "invalid" }
  return run((userId) => deletePrayer(prisma, userId, id))
}
