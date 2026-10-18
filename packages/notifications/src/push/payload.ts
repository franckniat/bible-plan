/** A button on a notification: it can lead somewhere other than the notification. */
export type PushAction = {
  /** Identifies the button to the service worker. */
  action: string
  title: string
  /** A path of the app, with the language ("/fr/today"). */
  href?: string
}

/**
 * What a push notification says. The service worker (public/sw.js in the web
 * app) shows `title` and `body`, and opens `href` when it is clicked.
 */
export type PushPayload = {
  title: string
  body: string
  /** A path of the app, with the language ("/fr/today"). */
  href: string
  /** A new notification with the same tag replaces the previous one. */
  tag?: string
  /** At most two are shown. */
  actions?: PushAction[]
}

/** The most a push service accepts is about 4 KB; stay well under it. */
export const maxPushPayloadBytes = 3000

/** The JSON a push message carries. Throws if it would not fit. */
export function serializePushPayload(payload: PushPayload): string {
  const json = JSON.stringify({
    ...payload,
    actions: payload.actions?.slice(0, 2),
  })
  if (new TextEncoder().encode(json).length > maxPushPayloadBytes) {
    throw new Error("Push payload too large")
  }
  return json
}
