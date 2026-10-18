import { describe, expect, it } from "vitest"

import { isIos, pushEnvironment, urlBase64ToUint8Array } from "./push-support"

const iphone = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
}
const android = { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/124.0" }
const ipadAsMac = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
  platform: "MacIntel",
  maxTouchPoints: 5,
}
const mac = { ...ipadAsMac, maxTouchPoints: 0 }
const supported = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
}

describe("isIos", () => {
  it("knows iPhones and iPads, including iPads that look like Macs", () => {
    expect(isIos(iphone)).toBe(true)
    expect(isIos(ipadAsMac)).toBe(true)
    expect(isIos(android)).toBe(false)
    expect(isIos(mac)).toBe(false)
  })
})

describe("pushEnvironment", () => {
  it("is ready where the browser supports push", () => {
    expect(
      pushEnvironment({ navigator: android, standalone: false, ...supported })
    ).toBe("ready")
  })

  it("asks an iPhone user to add the app to the home screen first", () => {
    expect(
      pushEnvironment({
        navigator: iphone,
        standalone: false,
        hasServiceWorker: true,
        hasPushManager: false,
        hasNotification: false,
      })
    ).toBe("ios-install")
  })

  it("is ready on an iPhone once the app is on the home screen", () => {
    expect(
      pushEnvironment({ navigator: iphone, standalone: true, ...supported })
    ).toBe("ready")
  })

  it("is unsupported without the Push API", () => {
    expect(
      pushEnvironment({
        navigator: android,
        standalone: false,
        ...supported,
        hasPushManager: false,
      })
    ).toBe("unsupported")
  })
})

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url key", () => {
    // "hello" is aGVsbG8 in base64url, without padding.
    expect([...urlBase64ToUint8Array("aGVsbG8")]).toEqual([
      104, 101, 108, 108, 111,
    ])
  })

  it("handles the url alphabet", () => {
    // 0xfb 0xff is "-_8" in base64url ("+/8=" in base64).
    expect([...urlBase64ToUint8Array("-_8")]).toEqual([0xfb, 0xff])
  })
})
