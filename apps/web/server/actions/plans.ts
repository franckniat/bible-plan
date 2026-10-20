"use server"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"
import { z } from "zod"

import {
  catchUpStrategies,
  getToday,
  newPlanSchema,
  PlanGenerationError,
  type CatchUpStrategy,
  type Locale,
  type NewPlan,
  type PlanGenerationErrorCode,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { redirect } from "@/i18n/navigation"
import { recordActivity } from "@/server/services/activity"
import {
  applyCatchUp,
  createPlan,
  deletePlan,
  setCatchUpStrategy,
  setPlanStatus,
  setReadingProgress,
  type CatchUpError,
} from "@/server/services/plans"
import { requireUser } from "@/server/session"

/** Translated by the wizard ("PlanWizard.create.errors.<code>"). */
export type CreatePlanErrorCode =
  PlanGenerationErrorCode | "invalid" | "unexpected"

/**
 * Creates a plan for the signed-in user, then opens the plan list. Returns
 * an error code when the plan cannot be created.
 */
export async function createPlanAction(
  request: NewPlan
): Promise<{ error: CreatePlanErrorCode }> {
  const user = await requireUser()
  const parsed = newPlanSchema.safeParse(request)
  if (!parsed.success) return { error: "invalid" }

  const locale = (await getLocale()) as Locale
  let planId: string
  try {
    ;({ id: planId } = await createPlan(prisma, user.id, parsed.data, locale))
  } catch (error) {
    if (error instanceof PlanGenerationError) return { error: error.code }
    console.error("Plan creation failed", error)
    return { error: "unexpected" }
  }

  revalidatePath("/[locale]/plans", "page")
  return redirect({
    href: { pathname: "/plans", query: { created: planId } },
    locale,
  })
}

/**
 * Marks a reading of the user's plans as read or not read. Returns false
 * when the reading is not one of theirs.
 */
export async function setReadingProgressAction(
  readingId: string,
  read: boolean
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  if (typeof readingId !== "string" || typeof read !== "boolean") {
    return { ok: false }
  }
  const ok = await setReadingProgress(prisma, user.id, readingId, read)
  if (ok) {
    // A reading counts for the streak, in the day of the user.
    await recordActivity(prisma, user.id, getToday(user.timezone), {
      readings: read ? 1 : -1,
    }).catch((error) => console.error("Recording activity failed", error))
    // Progress shows on Today, the plan list and the plan page.
    revalidatePath("/[locale]", "layout")
  }
  return { ok }
}

const statusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"])

/** Pauses, resumes, archives or restores a plan of the user. */
export async function setPlanStatusAction(
  planId: string,
  status: "ACTIVE" | "PAUSED" | "ARCHIVED"
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  const parsed = statusSchema.safeParse(status)
  if (typeof planId !== "string" || !parsed.success) return { ok: false }
  const ok = await setPlanStatus(prisma, user.id, planId, parsed.data)
  if (ok) revalidatePath("/[locale]", "layout")
  return { ok }
}

/** Deletes a plan of the user (or leaves it), then opens the plan list. */
export async function deletePlanAction(
  planId: string
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  if (typeof planId !== "string") return { ok: false }
  const ok = await deletePlan(prisma, user.id, planId)
  if (!ok) return { ok }
  revalidatePath("/[locale]", "layout")
  return redirect({ href: "/plans", locale: await getLocale() })
}

/** Chooses what happens when a plan of the user is late. */
export async function setCatchUpStrategyAction(
  planId: string,
  strategy: CatchUpStrategy
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  const parsed = z.enum(catchUpStrategies).safeParse(strategy)
  if (typeof planId !== "string" || !parsed.success) return { ok: false }
  const ok = await setCatchUpStrategy(prisma, user.id, planId, parsed.data)
  if (ok) revalidatePath("/[locale]", "layout")
  return { ok }
}

/**
 * Brings a late plan back on schedule with a strategy, for the user's own
 * day. Returns an error code when it cannot.
 */
export async function applyCatchUpAction(
  planId: string,
  strategy: CatchUpStrategy
): Promise<{ ok: true } | { ok: false; error: CatchUpError | "unexpected" }> {
  const user = await requireUser()
  const parsed = z.enum(catchUpStrategies).safeParse(strategy)
  if (typeof planId !== "string" || !parsed.success) {
    return { ok: false, error: "unexpected" }
  }
  try {
    const result = await applyCatchUp(
      prisma,
      user.id,
      planId,
      parsed.data,
      getToday(user.timezone)
    )
    if (!result.ok) return result
  } catch (error) {
    console.error("Catch-up failed", error)
    return { ok: false, error: "unexpected" }
  }
  revalidatePath("/[locale]", "layout")
  return { ok: true }
}
