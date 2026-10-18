import "server-only"

import type { NotificationType, PrismaClient } from "@workspace/db"

export type NotificationsDb = Pick<PrismaClient, "notification">

/** Notifications kept this long, read or not. */
export const notificationRetentionDays = 90

/** Notifications shown on the page. */
export const notificationPageSize = 30

export type NewNotification = {
  userId: string
  type: NotificationType
  title: string
  body?: string
  /** A path of the app without the language, e.g. "/today". */
  href?: string
}

export async function createNotification(
  db: NotificationsDb,
  { userId, type, title, body, href }: NewNotification
) {
  return db.notification.create({
    data: { userId, type, title, body, href },
    select: { id: true },
  })
}

/** The latest notifications of a user, newest first. */
export async function listNotifications(
  db: NotificationsDb,
  userId: string,
  limit = notificationPageSize
) {
  return db.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  })
}

export async function countUnread(
  db: NotificationsDb,
  userId: string
): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } })
}

/**
 * Marks one notification of the user as read. False when it is not theirs;
 * one already read keeps its first date of reading.
 */
export async function markRead(
  db: NotificationsDb,
  userId: string,
  notificationId: string,
  now = new Date()
): Promise<boolean> {
  // The owner is matched in the query itself.
  const { count } = await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: now },
  })
  if (count > 0) return true
  return (
    (await db.notification.count({ where: { id: notificationId, userId } })) > 0
  )
}

export async function markAllRead(
  db: NotificationsDb,
  userId: string,
  now = new Date()
): Promise<void> {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: now },
  })
}

/** Deletes the notifications older than the retention period. */
export async function purgeOldNotifications(
  db: NotificationsDb,
  now = new Date()
): Promise<number> {
  const limit = new Date(
    now.getTime() - notificationRetentionDays * 24 * 60 * 60 * 1000
  )
  const { count } = await db.notification.deleteMany({
    where: { createdAt: { lt: limit } },
  })
  return count
}
