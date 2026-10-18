"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@workspace/db"

import { markAllRead, markRead } from "@/server/services/notifications"
import { requireUser } from "@/server/session"

/** Marks a notification of the signed-in user as read. */
export async function markNotificationReadAction(
  notificationId: string
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  if (typeof notificationId !== "string") return { ok: false }
  const ok = await markRead(prisma, user.id, notificationId)
  // The count is on the bell, in every page of the signed-in area.
  if (ok) revalidatePath("/[locale]", "layout")
  return { ok }
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser()
  await markAllRead(prisma, user.id)
  revalidatePath("/[locale]", "layout")
}
