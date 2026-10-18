import { describe, expect, it } from "vitest"

import {
  isAllowedPushEndpoint,
  pushEndpointSchema,
  webPushSubscriptionSchema,
} from "./schema"

// A real-looking P-256 public key (65 bytes) and auth secret (16 bytes).
const p256dh =
  "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM"
const auth = "tBHItJI5svbpez7KI4CCXg"
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc:APA91b",
  keys: { p256dh, auth },
}

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QAb",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://jmt17.google.com.push.apple.com/x",
  ])("accepts %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true)
  })

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc", // not https
    "https://evil.example/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.example/x",
    "https://notfcm.googleapis.com.evil.example/x",
    "https://user:pass@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://169.254.169.254/latest/meta-data",
    "javascript:alert(1)",
    "not a url",
    "",
  ])("refuses %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false)
  })
})

describe("webPushSubscriptionSchema", () => {
  it("accepts a browser subscription", () => {
    expect(webPushSubscriptionSchema.parse(subscription)).toEqual(subscription)
  })

  it("ignores what the browser adds (expiration time)", () => {
    const parsed = webPushSubscriptionSchema.parse({
      ...subscription,
      expirationTime: null,
    })
    expect(parsed).toEqual(subscription)
  })

  it.each([
    ["an endpoint of another host", { endpoint: "https://evil.example/x" }],
    ["keys missing", { keys: undefined }],
    ["a key that is not base64url", { keys: { p256dh: "***", auth } }],
    ["a p256dh key too short", { keys: { p256dh: "abc", auth } }],
    ["an auth secret too long", { keys: { p256dh, auth: auth.repeat(3) } }],
  ])("rejects %s", (_, override) => {
    expect(
      webPushSubscriptionSchema.safeParse({ ...subscription, ...override })
        .success
    ).toBe(false)
  })
})

describe("pushEndpointSchema", () => {
  it("only accepts an endpoint of a push service", () => {
    expect(
      pushEndpointSchema.safeParse({ endpoint: subscription.endpoint }).success
    ).toBe(true)
    expect(
      pushEndpointSchema.safeParse({ endpoint: "https://evil.example" }).success
    ).toBe(false)
  })
})
