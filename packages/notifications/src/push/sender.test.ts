import { describe, expect, it, vi } from "vitest"

import { maxPushPayloadBytes, serializePushPayload } from "./payload"
import {
  createWebPushSender,
  getVapidConfig,
  isGoneStatus,
  type PushTarget,
} from "./sender"

const vapid = {
  publicKey: "public",
  privateKey: "private",
  subject: "mailto:me@example.com",
}
const target: PushTarget = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "p", auth: "a" },
}
const payload = {
  title: "Time to read",
  body: "Your reading",
  href: "/fr/today",
}

describe("getVapidConfig", () => {
  it("is the key pair and the contact", () => {
    expect(
      getVapidConfig({
        VAPID_PUBLIC_KEY: "public",
        VAPID_PRIVATE_KEY: "private",
        VAPID_SUBJECT: "mailto:me@example.com",
      })
    ).toEqual(vapid)
  })

  it.each([
    ["nothing set", {}],
    [
      "no private key",
      { VAPID_PUBLIC_KEY: "p", VAPID_SUBJECT: "mailto:a@b.c" },
    ],
    ["no contact", { VAPID_PUBLIC_KEY: "p", VAPID_PRIVATE_KEY: "k" }],
    [
      "a contact that is neither mailto nor https",
      { VAPID_PUBLIC_KEY: "p", VAPID_PRIVATE_KEY: "k", VAPID_SUBJECT: "me" },
    ],
  ])("is null with %s", (_, env) => {
    expect(getVapidConfig(env)).toBeNull()
  })
})

describe("createWebPushSender", () => {
  it("sends the payload as JSON with the VAPID details and a short life", async () => {
    const sendNotification = vi.fn().mockResolvedValue({ statusCode: 201 })
    const result = await createWebPushSender(vapid, sendNotification).send(
      target,
      payload
    )

    expect(result).toEqual({ status: "sent" })
    expect(sendNotification).toHaveBeenCalledWith(
      target,
      JSON.stringify(payload),
      { TTL: 3600, urgency: "normal", vapidDetails: vapid }
    )
  })

  it.each([404, 410])(
    "says a subscription is gone on %i",
    async (statusCode) => {
      const sendNotification = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("gone"), { statusCode }))
      expect(
        await createWebPushSender(vapid, sendNotification).send(target, payload)
      ).toEqual({ status: "gone" })
    }
  )

  it("reports another failure without calling the subscription gone", async () => {
    const sendNotification = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("too many"), { statusCode: 429 })
      )
    expect(
      await createWebPushSender(vapid, sendNotification).send(target, payload)
    ).toEqual({ status: "failed", error: "too many" })
  })

  it("reports a failure that is not an error object", async () => {
    const sendNotification = vi.fn().mockRejectedValue("boom")
    expect(
      await createWebPushSender(vapid, sendNotification).send(target, payload)
    ).toEqual({ status: "failed", error: "boom" })
  })
})

describe("isGoneStatus", () => {
  it("is 404 and 410 only", () => {
    expect([404, 410, 400, 429, 500, undefined].map(isGoneStatus)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ])
  })
})

describe("serializePushPayload", () => {
  it("keeps two actions at most", () => {
    const json = serializePushPayload({
      ...payload,
      actions: [
        { action: "a", title: "A" },
        { action: "b", title: "B" },
        { action: "c", title: "C" },
      ],
    })
    expect(JSON.parse(json).actions).toHaveLength(2)
  })

  it("refuses a payload a push service would reject", () => {
    expect(() =>
      serializePushPayload({
        ...payload,
        body: "x".repeat(maxPushPayloadBytes),
      })
    ).toThrow("too large")
  })
})
