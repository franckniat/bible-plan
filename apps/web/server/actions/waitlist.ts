"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { waitlistSignupSchema, type WaitlistSignup } from "@workspace/core"
import { prisma } from "@workspace/db"

import {
  MAX_SIGNUPS_PER_IP_PER_HOUR,
  getClientIp,
  getIpHashSecret,
  hashIp,
  isHoneypotFilled,
  isSubmittedTooFast,
} from "@/server/anti-spam"
import { countSignupsFromIp, joinWaitlist } from "@/server/services/waitlist"

type WaitlistField = keyof WaitlistSignup

/** Error codes translated by the form ("WaitlistForm.errors.<code>"). */
export type WaitlistErrorCode =
  | "invalid_email"
  | "too_long"
  | "consent_required"
  | "invalid"
  | "rate_limited"
  | "unexpected"

export type WaitlistFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error"
      fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>>
      formError?: WaitlistErrorCode
    }

const knownCodes = new Set<string>([
  "invalid_email",
  "too_long",
  "consent_required",
])

const ONE_HOUR_MS = 60 * 60 * 1000

export async function joinWaitlistAction(
  _previous: WaitlistFormState,
  formData: FormData
): Promise<WaitlistFormState> {
  // Bots get the same answer as humans so they learn nothing.
  if (
    isHoneypotFilled(formData.get("website")) ||
    isSubmittedTooFast(formData.get("startedAt"))
  ) {
    return { status: "success" }
  }

  const field = (name: string) => formData.get(name) ?? undefined
  const parsed = waitlistSignupSchema.safeParse({
    email: field("email"),
    firstName: field("firstName"),
    country: field("country"),
    interests: formData.getAll("interests"),
    locale: field("locale"),
    consent: formData.get("consent") === "on",
  })

  if (!parsed.success) {
    const fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> = {}
    for (const [name, messages] of Object.entries(
      z.flattenError(parsed.error).fieldErrors
    )) {
      const message = (messages as string[] | undefined)?.[0] ?? ""
      fieldErrors[name as WaitlistField] = knownCodes.has(message)
        ? (message as WaitlistErrorCode)
        : "invalid"
    }
    return { status: "error", fieldErrors }
  }

  try {
    const ip = getClientIp(await headers())
    const ipHash = ip ? hashIp(ip, getIpHashSecret()) : undefined

    if (ipHash) {
      const since = new Date(Date.now() - ONE_HOUR_MS)
      const recent = await countSignupsFromIp(prisma, ipHash, since)
      if (recent >= MAX_SIGNUPS_PER_IP_PER_HOUR) {
        return { status: "error", fieldErrors: {}, formError: "rate_limited" }
      }
    }

    await joinWaitlist(prisma, parsed.data, { ipHash })
  } catch (error) {
    console.error("Waitlist signup failed", error)
    return { status: "error", fieldErrors: {}, formError: "unexpected" }
  }

  // Refresh the counter shown on the landing page.
  revalidatePath("/[locale]", "page")
  return { status: "success" }
}
