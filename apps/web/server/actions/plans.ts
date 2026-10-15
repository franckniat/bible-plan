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
import { createPlan } from "@/server/services/plans"
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
