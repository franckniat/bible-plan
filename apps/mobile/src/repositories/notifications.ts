import { and, count, desc, gt, inArray, isNull, lte } from "drizzle-orm"

import { notifyChange, useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { notificationLog } from "@/db/schema"
import type { Database } from "@/db/types"

export type LoggedNotification = typeof notificationLog.$inferSelect

/** Notifications are kept this long in the centre, as on the web. */
export const keptDays = 30

const tables = ["notificationLog"]

/**
 * Records the reminders just scheduled, in place of those not rung yet (they
 * were cancelled): the centre lists them once their time has come.
 */
export function logScheduled(
  db: Database,
  scheduled: Omit<LoggedNotification, "readAt">[],
  now: Date = new Date()
): void {
  const at = now.toISOString()
  const before = new Date(now.getTime() - keptDays * 86_400_000).toISOString()
  db.transaction((tx) => {
    tx.delete(notificationLog).where(gt(notificationLog.at, at)).run()
    tx.delete(notificationLog).where(lte(notificationLog.at, before)).run()
    for (const entry of scheduled) {
      tx.insert(notificationLog).values(entry).onConflictDoNothing().run()
    }
  })
  notifyChange(...tables)
}

/** The reminders rung, most recent first. */
export function listRung(db: Database, now: Date): LoggedNotification[] {
  return db
    .select()
    .from(notificationLog)
    .where(lte(notificationLog.at, now.toISOString()))
    .orderBy(desc(notificationLog.at))
    .all()
}

export function unreadCount(db: Database, now: Date): number {
  const [row] = db
    .select({ count: count() })
    .from(notificationLog)
    .where(
      and(
        lte(notificationLog.at, now.toISOString()),
        isNull(notificationLog.readAt)
      )
    )
    .all()
  return row?.count ?? 0
}

/** Marks rung reminders as read: some, or all. */
export function markRead(db: Database, now: Date, ids?: string[]): void {
  db.update(notificationLog)
    .set({ readAt: now.toISOString() })
    .where(
      and(
        lte(notificationLog.at, now.toISOString()),
        isNull(notificationLog.readAt),
        ids ? inArray(notificationLog.id, ids) : undefined
      )
    )
    .run()
  notifyChange(...tables)
}

/** The centre's list; `now` moves with the screens that show it. */
export function useRungNotifications(now: number): LoggedNotification[] {
  return useLocalQuery(tables, () => listRung(getDatabase(), new Date(now)), [
    Math.floor(now / 60_000),
  ])
}

export function useUnreadNotifications(now: number): number {
  return useLocalQuery(
    tables,
    () => unreadCount(getDatabase(), new Date(now)),
    [Math.floor(now / 60_000)]
  )
}

/** The centre's actions, outside screens too (scheduling). */
export const notificationCentre = {
  logScheduled: (scheduled: Omit<LoggedNotification, "readAt">[], now?: Date) =>
    logScheduled(getDatabase(), scheduled, now),
  markRead: (ids?: string[]) => markRead(getDatabase(), new Date(), ids),
}
