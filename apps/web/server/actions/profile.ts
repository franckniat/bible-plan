"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  profileSettingsSchema,
  timeZoneSchema,
  type Locale,
  type ProfileSettings,
} from "@workspace/core"
import { isBibleVersionId } from "@workspace/bible-data"
import { prisma } from "@workspace/db"

import {
  setBibleVersion,
  setDetectedTimeZone,
  updateProfile,
} from "@/server/services/profile"
import { requireUser } from "@/server/session"

type ProfileField = keyof ProfileSettings

/** Error codes translated by the form ("Settings.errors.<code>"). */
export type ProfileErrorCode =
  "required" | "too_long" | "invalid" | "unexpected"

export type ProfileFormState =
  | { status: "idle" }
  | { status: "success"; locale: Locale }
  | {
      status: "error"
      fieldErrors: Partial<Record<ProfileField, ProfileErrorCode>>
      formError?: ProfileErrorCode
    }

const knownCodes = new Set<string>(["required", "too_long"])

export async function updateProfileAction(
  _previous: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser()

  const parsed = profileSettingsSchema.safeParse({
    name: formData.get("name") ?? "",
    locale: formData.get("locale"),
    timezone: formData.get("timezone") ?? "",
    readingWpm: formData.get("readingWpm") ?? "",
  })

  if (!parsed.success) {
    const fieldErrors: Partial<Record<ProfileField, ProfileErrorCode>> = {}
    for (const [name, messages] of Object.entries(
      z.flattenError(parsed.error).fieldErrors
    )) {
      const message = (messages as string[] | undefined)?.[0] ?? ""
      fieldErrors[name as ProfileField] = knownCodes.has(message)
        ? (message as ProfileErrorCode)
        : "invalid"
    }
    return { status: "error", fieldErrors }
  }

  try {
    await updateProfile(prisma, user.id, parsed.data)
  } catch (error) {
    console.error("Profile update failed", error)
    return { status: "error", fieldErrors: {}, formError: "unexpected" }
  }

  // The name is shown in the whole signed-in area.
  revalidatePath("/[locale]", "layout")
  return { status: "success", locale: parsed.data.locale }
}

/** Saves the browser time zone on the first visit (see TimeZoneDetector). */
export async function detectTimeZoneAction(timezone: string): Promise<void> {
  const user = await requireUser()
  const parsed = timeZoneSchema.safeParse(timezone)
  if (!parsed.success || user.timezone) return
  await setDetectedTimeZone(prisma, user.id, parsed.data)
}

/** Chooses the Bible version of the reader (one shipped with the app). */
export async function setBibleVersionAction(
  version: string
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  if (!isBibleVersionId(version)) return { ok: false }
  await setBibleVersion(prisma, user.id, version)
  revalidatePath("/[locale]", "layout")
  return { ok: true }
}
