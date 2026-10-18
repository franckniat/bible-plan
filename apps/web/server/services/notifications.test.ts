import { describe, expect, it, vi } from "vitest"

import {
  countUnread,
  createNotification,
  listNotifications,
  markAllRead,
  markRead,
  notificationRetentionDays,
  purgeOldNotifications,
  type NotificationsDb,
} from "./notifications"

function db(notification: Record<string, unknown>) {
  return { notification } as unknown as NotificationsDb
}
const now = new Date("2026-10-18T10:00:00Z")

describe("createNotification", () => {
  it("stores the notification for the user", async () => {
    const notification = { create: vi.fn().mockResolvedValue({ id: "n1" }) }
    await createNotification(db(notification), {
      userId: "user-1",
      type: "REMINDER",
      title: "Time to read",
      href: "/today",
    })
    expect(notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "REMINDER",
        title: "Time to read",
        body: undefined,
        href: "/today",
      },
      select: { id: true },
    })
  })
})

describe("listNotifications", () => {
  it("lists only the notifications of the user, newest first", async () => {
    const notification = { findMany: vi.fn().mockResolvedValue([]) }
    await listNotifications(db(notification), "user-1", 10)
    expect(notification.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
    })
  })
})

describe("countUnread", () => {
  it("counts the unread notifications of the user", async () => {
    const notification = { count: vi.fn().mockResolvedValue(3) }
    expect(await countUnread(db(notification), "user-1")).toBe(3)
    expect(notification.count).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    })
  })
})

describe("markRead", () => {
  it("marks an unread notification of the user", async () => {
    const notification = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn(),
    }
    expect(await markRead(db(notification), "user-1", "n1", now)).toBe(true)
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-1", readAt: null },
      data: { readAt: now },
    })
    expect(notification.count).not.toHaveBeenCalled()
  })

  it("accepts one that is already read, without changing it", async () => {
    const notification = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(1),
    }
    expect(await markRead(db(notification), "user-1", "n1", now)).toBe(true)
  })

  it("refuses the notification of someone else", async () => {
    const notification = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    }
    expect(await markRead(db(notification), "user-2", "n1", now)).toBe(false)
    expect(notification.count).toHaveBeenCalledWith({
      where: { id: "n1", userId: "user-2" },
    })
  })
})

describe("markAllRead", () => {
  it("marks the unread notifications of the user", async () => {
    const notification = { updateMany: vi.fn() }
    await markAllRead(db(notification), "user-1", now)
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
      data: { readAt: now },
    })
  })
})

describe("purgeOldNotifications", () => {
  it("deletes the notifications past the retention period", async () => {
    const notification = { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) }
    expect(await purgeOldNotifications(db(notification), now)).toBe(4)
    const { createdAt } = notification.deleteMany.mock.calls[0]![0].where
    const days = (now.getTime() - createdAt.lt.getTime()) / 86_400_000
    expect(days).toBe(notificationRetentionDays)
  })
})
