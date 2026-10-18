import { describe, expect, it, vi } from "vitest"

import type { WebPushSubscription } from "@workspace/core"
import type { PushResult, PushSender } from "@workspace/notifications"

import {
  listPushDevices,
  pushToUser,
  maxPushDevicesPerUser,
  removePushDevices,
  subscribeWebPush,
  unsubscribeWebPush,
  type PushDevicesDb,
} from "./push-devices"

const subscription: WebPushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "p256dh-key", auth: "auth-secret" },
}

function db(pushDevice: Record<string, unknown>) {
  return { pushDevice } as unknown as PushDevicesDb
}

describe("subscribeWebPush", () => {
  it("registers the browser, or moves it to the account that subscribes now", async () => {
    const pushDevice = {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    }
    await subscribeWebPush(db(pushDevice), "user-1", subscription, "Chrome")

    expect(pushDevice.upsert).toHaveBeenCalledWith({
      where: { token: subscription.endpoint },
      create: {
        userId: "user-1",
        kind: "WEB_PUSH",
        token: subscription.endpoint,
        p256dh: "p256dh-key",
        auth: "auth-secret",
        userAgent: "Chrome",
      },
      update: {
        userId: "user-1",
        p256dh: "p256dh-key",
        auth: "auth-secret",
        userAgent: "Chrome",
      },
    })
    expect(pushDevice.deleteMany).not.toHaveBeenCalled()
  })

  it("drops the oldest devices past the limit", async () => {
    const pushDevice = {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([{ id: "old-1" }, { id: "old-2" }]),
      deleteMany: vi.fn(),
    }
    await subscribeWebPush(db(pushDevice), "user-1", subscription)

    expect(pushDevice.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      skip: maxPushDevicesPerUser,
    })
    expect(pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-1", "old-2"] } },
    })
  })

  it("keeps a long user agent short", async () => {
    const pushDevice = {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    }
    await subscribeWebPush(db(pushDevice), "u", subscription, "x".repeat(1000))
    expect(pushDevice.upsert.mock.calls[0]![0].create.userAgent).toHaveLength(
      300
    )
  })
})

describe("unsubscribeWebPush", () => {
  it("removes a browser of the user only", async () => {
    const pushDevice = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) }
    expect(
      await unsubscribeWebPush(db(pushDevice), "user-1", subscription.endpoint)
    ).toBe(true)
    expect(pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { token: subscription.endpoint, userId: "user-1" },
    })
  })

  it("does nothing for the browser of someone else", async () => {
    const pushDevice = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }
    expect(
      await unsubscribeWebPush(db(pushDevice), "user-2", subscription.endpoint)
    ).toBe(false)
  })
})

describe("listPushDevices", () => {
  it("lists the devices of the user, newest first", async () => {
    const pushDevice = { findMany: vi.fn().mockResolvedValue([]) }
    await listPushDevices(db(pushDevice), "user-1")
    expect(pushDevice.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, userAgent: true, createdAt: true },
    })
  })
})

describe("removePushDevices", () => {
  it("forgets the devices that are gone", async () => {
    const pushDevice = { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) }
    expect(await removePushDevices(db(pushDevice), ["a", "b"])).toBe(2)
    expect(pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["a", "b"] } },
    })
  })

  it("does not query for nothing", async () => {
    const pushDevice = { deleteMany: vi.fn() }
    expect(await removePushDevices(db(pushDevice), [])).toBe(0)
    expect(pushDevice.deleteMany).not.toHaveBeenCalled()
  })
})

describe("pushToUser", () => {
  const payload = { title: "Time to read", body: "Now", href: "/fr/today" }
  const devices = [
    { token: "https://fcm.googleapis.com/ok", p256dh: "p1", auth: "a1" },
    { token: "https://fcm.googleapis.com/gone", p256dh: "p2", auth: "a2" },
    { token: "https://fcm.googleapis.com/down", p256dh: "p3", auth: "a3" },
    { token: "expo-token", p256dh: null, auth: null },
  ]
  const answers: Record<string, PushResult> = {
    "https://fcm.googleapis.com/ok": { status: "sent" },
    "https://fcm.googleapis.com/gone": { status: "gone" },
    "https://fcm.googleapis.com/down": { status: "failed", error: "503" },
  }
  const sender = (): PushSender => ({
    send: vi.fn(async (target) => answers[target.endpoint]!),
  })

  it("pushes to each browser, forgets the ones that are gone and marks the others", async () => {
    const pushDevice = {
      findMany: vi.fn().mockResolvedValue(devices),
      updateMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    }
    const push = sender()
    const now = new Date("2026-10-19T10:00:00Z")
    const outcome = await pushToUser(
      db(pushDevice),
      push,
      "user-1",
      payload,
      now
    )

    expect(outcome).toEqual({ sent: 1, removed: 1, failed: 1 })
    expect(pushDevice.findMany.mock.calls[0]![0].where).toEqual({
      userId: "user-1",
      kind: "WEB_PUSH",
    })
    // The Expo token has no keys: it is not a browser, nothing is sent to it.
    expect(push.send).toHaveBeenCalledTimes(3)
    expect(pushDevice.updateMany).toHaveBeenCalledWith({
      where: { token: { in: ["https://fcm.googleapis.com/ok"] } },
      data: { lastUsedAt: now },
    })
    expect(pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["https://fcm.googleapis.com/gone"] } },
    })
  })

  it("does nothing for a user without a device", async () => {
    const pushDevice = {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    }
    const push = sender()
    expect(await pushToUser(db(pushDevice), push, "user-1", payload)).toEqual({
      sent: 0,
      removed: 0,
      failed: 0,
    })
    expect(push.send).not.toHaveBeenCalled()
    expect(pushDevice.updateMany).not.toHaveBeenCalled()
  })
})
