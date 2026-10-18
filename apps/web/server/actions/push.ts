"use server"

import { getLocale } from "next-intl/server"

import { prisma } from "@workspace/db"
import { createPushSender } from "@workspace/notifications"

import { pushToUser } from "@/server/services/push-devices"
import { requireUser } from "@/server/session"

export type TestPushResult =
  | { status: "sent"; devices: number }
  | { status: "no_device" }
  | { status: "unavailable" }
  | { status: "failed" }

/**
 * Sends a test notification to the devices of the signed-in user, so they can
 * check that reminders will reach them.
 */
export async function sendTestPushAction(): Promise<TestPushResult> {
  const user = await requireUser()
  const sender = createPushSender()
  if (!sender) return { status: "unavailable" }

  const locale = await getLocale()
  const french = locale !== "en"
  try {
    const outcome = await pushToUser(prisma, sender, user.id, {
      title: french ? "Notifications activées" : "Notifications are on",
      body: french
        ? "Vos rappels arriveront ici."
        : "Your reminders will arrive here.",
      href: `/${locale}/settings/reminders`,
      tag: "push-test",
    })
    if (outcome.sent > 0) return { status: "sent", devices: outcome.sent }
    return outcome.failed > 0 ? { status: "failed" } : { status: "no_device" }
  } catch (error) {
    console.error("Test push failed", error)
    return { status: "failed" }
  }
}
