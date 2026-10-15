"use server"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import {
  newPlanSchema,
  PlanGenerationError,
  type Locale,
  type NewPlan,
  type PlanGenerationErrorCode,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { redirect } from "@/i18n/navigation"
import { createPlan, setReadingProgress } from "@/server/services/plans"
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
  // Progress shows on Today, the plan list and the plan page.
  if (ok) revalidatePath("/[locale]", "layout")
  return { ok }
}
