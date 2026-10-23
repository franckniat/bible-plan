"use server"

import { headers } from "next/headers"
import { getLocale } from "next-intl/server"

import { prisma } from "@workspace/db"

import { redirect } from "@/i18n/navigation"
import { auth } from "@/server/auth"
import { acceptTerms, deleteAccount } from "@/server/services/account"
import { requireUser } from "@/server/session"

export type ConsentFormState =
  | { status: "idle" }
  | { status: "error"; code: "required" | "unexpected" }

/** Records the consent to the privacy policy and terms, then enters the app. */
export async function acceptTermsAction(
  _previous: ConsentFormState,
  formData: FormData
): Promise<ConsentFormState> {
  const user = await requireUser()
  if (formData.get("consent") !== "on") {
    return { status: "error", code: "required" }
  }
  try {
    await acceptTerms(prisma, user.id)
  } catch (error) {
    console.error("Recording the consent failed", error)
    return { status: "error", code: "unexpected" }
  }
  return redirect({ href: "/today", locale: await getLocale() })
}

export type DeleteAccountState =
  | { status: "idle" }
  | { status: "deleted" }
  | { status: "error"; code: "mismatch" | "ownsGroup" | "unexpected" }

/** Deletes the account and all its data, after the e-mail address is retyped. */
export async function deleteAccountAction(
  _previous: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const user = await requireUser()
  const typed = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  if (typed !== user.email.trim().toLowerCase()) {
    return { status: "error", code: "mismatch" }
  }

  try {
    const result = await deleteAccount(prisma, user.id)
    if (!result.ok) {
      return {
        status: "error",
        code: result.error === "ownsGroup" ? "ownsGroup" : "unexpected",
      }
    }
  } catch (error) {
    console.error("Account deletion failed", error)
    return { status: "error", code: "unexpected" }
  }

  // The session no longer exists; this also clears its cookie.
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined)
  return { status: "deleted" }
}
