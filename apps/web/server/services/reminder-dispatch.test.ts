import { describe, expect, it, vi } from "vitest"

import { dispatchDueReminders, type DispatchDb } from "./reminder-dispatch"

// Thursday 2026-01-15, 06:00 in Paris.
const now = new Date("2026-01-15T05:00:00Z")
const dueAt = new Date("2026-01-15T04:00:00Z")

const user = {
  id: "user-1",
  name: "Marie",
  email: "marie@example.com",
  emailVerified: true,
  locale: "fr",
}
const reminder = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  kind: "READING",
  channels: ["IN_APP"],
  localTime: "07:00",
  timezone: "Europe/Paris",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  nextRunAt: dueAt,
  user,
  ...overrides,
})

const describeKind = vi.fn(async () => ({
  title: "Time to read",
  body: "Your reading",
  href: "/today",
}))

function setup(
  due: ReturnType<typeof reminder>[],
  {
    claimed = 1,
    deliveryError,
  }: { claimed?: number; deliveryError?: unknown } = {}
) {
  const db = {
    reminder: {
      findMany: vi.fn().mockResolvedValue(due),
      updateMany: vi.fn().mockResolvedValue({ count: claimed }),
    },
    reminderDelivery: {
      create: deliveryError
        ? vi.fn().mockRejectedValue(deliveryError)
        : vi.fn().mockResolvedValue({ id: "d1" }),
      update: vi.fn(),
    },
    notification: { create: vi.fn().mockResolvedValue({ id: "n1" }) },
  }
  return { db, typed: db as unknown as DispatchDb }
}

describe("dispatchDueReminders", () => {
  it("looks for the enabled reminders whose time has passed", async () => {
    const { db, typed } = setup([])
    await dispatchDueReminders(typed, {
      now,
      batchSize: 50,
      content: describeKind,
    })
    expect(db.reminder.findMany.mock.calls[0]![0]).toMatchObject({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: "asc" },
      take: 50,
    })
  })

  it("takes the reminder by moving its next run forward, then notifies", async () => {
    const { db, typed } = setup([reminder()])
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
    })

    expect(db.reminder.updateMany).toHaveBeenCalledWith({
      // Only if nobody else has taken this occurrence.
      where: { id: "r1", enabled: true, nextRunAt: dueAt },
      // Next 7:00 in Paris after now (06:00 Paris): today at 06:00 UTC.
      data: { nextRunAt: new Date("2026-01-15T06:00:00Z"), lastRunAt: now },
    })
    expect(db.reminderDelivery.create).toHaveBeenCalledWith({
      data: { reminderId: "r1", dueAt, channel: "IN_APP" },
      select: { id: true },
    })
    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "REMINDER",
        title: "Time to read",
        body: "Your reading",
        href: "/today",
      },
      select: { id: true },
    })
    expect(result).toEqual({
      due: 1,
      claimed: 1,
      skipped: 0,
      delivered: 1,
      failed: 0,
    })
  })

  it("does not deliver a reminder another run has already taken", async () => {
    const { db, typed } = setup([reminder()], { claimed: 0 })
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
    })
    expect(db.reminderDelivery.create).not.toHaveBeenCalled()
    expect(db.notification.create).not.toHaveBeenCalled()
    expect(result).toEqual({
      due: 1,
      claimed: 0,
      skipped: 0,
      delivered: 0,
      failed: 0,
    })
  })

  it("never notifies twice for the same occurrence and channel", async () => {
    const { db, typed } = setup([reminder()], {
      deliveryError: { code: "P2002" },
    })
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
    })
    expect(db.notification.create).not.toHaveBeenCalled()
    expect(result.delivered).toBe(0)
    expect(result.failed).toBe(0)
  })

  it("delivers a very late reminder once, and schedules the next one after now", async () => {
    const weekAgo = new Date("2026-01-08T06:00:00Z")
    const { db, typed } = setup([reminder({ nextRunAt: weekAgo })])
    await dispatchDueReminders(typed, { now, content: describeKind })
    expect(db.reminder.updateMany.mock.calls[0]![0].data.nextRunAt).toEqual(
      new Date("2026-01-15T06:00:00Z")
    )
    expect(db.notification.create).toHaveBeenCalledTimes(1)
  })

  it("leaves the email channel alone while reminders by email are off", async () => {
    const { db, typed } = setup([reminder({ channels: ["IN_APP", "EMAIL"] })])
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
    })
    expect(db.reminderDelivery.create).toHaveBeenCalledTimes(1)
    expect(result.delivered).toBe(1)
  })

  it("sends the email when it is on and the address is verified", async () => {
    const sendEmail = vi.fn()
    const { typed } = setup([reminder({ channels: ["IN_APP", "EMAIL"] })])
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
      sendEmail,
    })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0]![1]).toEqual(dueAt)
    expect(result.delivered).toBe(2)
  })

  it("does not email an unverified address", async () => {
    const sendEmail = vi.fn()
    const { typed } = setup([
      reminder({
        channels: ["EMAIL"],
        user: { ...user, emailVerified: false },
      }),
    ])
    await dispatchDueReminders(typed, {
      now,
      content: describeKind,
      sendEmail,
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("records a failed delivery without stopping the batch", async () => {
    const { db, typed } = setup([reminder(), reminder({ id: "r2" })])
    db.notification.create
      .mockRejectedValueOnce(new Error("database down"))
      .mockResolvedValueOnce({ id: "n2" })
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
    })

    expect(db.reminderDelivery.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { error: "database down" },
    })
    expect(result).toEqual({
      due: 2,
      claimed: 2,
      skipped: 0,
      delivered: 1,
      failed: 1,
    })
  })

  it("pushes on the push channel when push is set up", async () => {
    const sendPush = vi.fn()
    const { db, typed } = setup([reminder({ channels: ["IN_APP", "PUSH"] })])
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
      sendPush,
    })
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush.mock.calls[0]![1]).toEqual(dueAt)
    expect(db.reminderDelivery.create).toHaveBeenCalledWith({
      data: { reminderId: "r1", dueAt, channel: "PUSH" },
      select: { id: true },
    })
    expect(result.delivered).toBe(2)
  })

  it("leaves the push channel alone while push is not set up", async () => {
    const { db, typed } = setup([reminder({ channels: ["IN_APP", "PUSH"] })])
    const result = await dispatchDueReminders(typed, {
      now,
      content: describeKind,
    })
    expect(db.reminderDelivery.create).toHaveBeenCalledTimes(1)
    expect(result.delivered).toBe(1)
  })

  it("takes a reminder with nothing to say and sends nothing for it", async () => {
    const { db, typed } = setup([reminder({ channels: ["IN_APP", "PUSH"] })])
    const sendPush = vi.fn()
    const result = await dispatchDueReminders(typed, {
      now,
      content: async () => null,
      sendPush,
    })
    // Taken, so its next run moves on; but no delivery and no message.
    expect(db.reminder.updateMany).toHaveBeenCalledTimes(1)
    expect(db.reminderDelivery.create).not.toHaveBeenCalled()
    expect(db.notification.create).not.toHaveBeenCalled()
    expect(sendPush).not.toHaveBeenCalled()
    expect(result).toEqual({
      due: 1,
      claimed: 1,
      skipped: 1,
      delivered: 0,
      failed: 0,
    })
  })

  it("gives the push sender the content, buttons included", async () => {
    const sendPush = vi.fn()
    const content = {
      title: "Time to read",
      body: "Mt 6",
      href: "/read/Matt.6",
      actions: [{ action: "today", title: "Today", href: "/today" }],
    }
    const { typed } = setup([reminder({ channels: ["PUSH"] })])
    await dispatchDueReminders(typed, {
      now,
      content: async () => content,
      sendPush,
    })
    expect(sendPush.mock.calls[0]![2]).toEqual(content)
  })
})
