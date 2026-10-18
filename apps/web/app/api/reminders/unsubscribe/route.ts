import { hasLocale } from "next-intl"

import { defaultLocale } from "@workspace/core"
import { prisma } from "@workspace/db"

import { routing } from "@/i18n/routing"
import { verifyReminderToken } from "@/lib/reminder-token"
import { disableReminderFromLink } from "@/server/services/reminders"

export const dynamic = "force-dynamic"

/** Switches off the reminder of the link, or answers with an error. */
async function unsubscribe(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) return { error: new Response("Not configured", { status: 500 }) }

  const token = new URL(request.url).searchParams.get("token") ?? ""
  const reminderId = verifyReminderToken(token, secret)
  if (!reminderId) {
    return { error: new Response("Invalid link", { status: 400 }) }
  }

  const done = await disableReminderFromLink(prisma, reminderId)
  // A reminder deleted since is as good as switched off.
  return { locale: done?.locale }
}

/** The link in the email: switches the reminder off, then says so. */
export async function GET(request: Request) {
  const result = await unsubscribe(request)
  if ("error" in result) return result.error
  const locale = hasLocale(routing.locales, result.locale)
    ? result.locale
    : defaultLocale
  return Response.redirect(new URL(`/${locale}/unsubscribed`, request.url), 303)
}

/** One-click unsubscribe of mail apps (RFC 8058, List-Unsubscribe-Post). */
export async function POST(request: Request) {
  const result = await unsubscribe(request)
  if ("error" in result) return result.error
  return new Response("Unsubscribed", { status: 200 })
}
