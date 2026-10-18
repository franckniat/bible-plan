/** What this browser can do about push notifications. */
export type PushEnvironment =
  | "unsupported" // no service worker or Push API
  | "ios-install" // iPhone or iPad, but not from the home screen
  | "ready"

type NavigatorLike = {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
  standalone?: boolean
}

/** iPhone, iPad, and iPads that present themselves as a Mac. */
export function isIos(navigator: NavigatorLike): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1)
  )
}

/**
 * Whether push can be asked for here. On iOS (16.4 and later) it only works
 * for an app added to the home screen, which opens in standalone mode.
 */
export function pushEnvironment({
  navigator,
  standalone,
  hasServiceWorker,
  hasPushManager,
  hasNotification,
}: {
  navigator: NavigatorLike
  /** `display-mode: standalone`, or `navigator.standalone` on iOS. */
  standalone: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}): PushEnvironment {
  // On iOS the Push API only appears once the app is on the home screen.
  if (isIos(navigator) && !standalone) return "ios-install"
  return hasServiceWorker && hasPushManager && hasNotification
    ? "ready"
    : "unsupported"
}

/** The key a push subscription is made with, from its base64url text. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded.replaceAll("-", "+").replaceAll("_", "/"))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
