import { serializePushPayload, type PushPayload } from "./payload"

/** The key pair that identifies the server to push services (VAPID). */
export type VapidConfig = {
  publicKey: string
  privateKey: string
  /** A contact for the push services: "mailto:…" or an https address. */
  subject: string
}

/** The environment the VAPID keys are read from: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT. */
export type PushEnv = Record<string, string | undefined>

/** The VAPID configuration, or null while push is not set up. */
export function getVapidConfig(env: PushEnv = process.env): VapidConfig | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null
  // The push services want a contact, in one of these two forms.
  if (!/^(mailto:|https:\/\/)/.test(VAPID_SUBJECT)) return null
  return {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
    subject: VAPID_SUBJECT,
  }
}

/** A browser subscription, as stored. */
export type PushTarget = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/**
 * What came of a push to one subscription: `gone` means the push service says
 * it no longer exists (404 or 410), so it should be forgotten.
 */
export type PushResult =
  { status: "sent" } | { status: "gone" } | { status: "failed"; error: string }

export interface PushSender {
  send(target: PushTarget, payload: PushPayload): Promise<PushResult>
}

/** What the `web-push` library's sendNotification needs and returns. */
export type SendNotification = (
  subscription: PushTarget,
  payload: string,
  options: {
    TTL: number
    urgency: "very-low" | "low" | "normal" | "high"
    vapidDetails: { subject: string; publicKey: string; privateKey: string }
  }
) => Promise<unknown>

/** How long a push service may hold a message for a device that is off. */
const reminderTtlSeconds = 60 * 60

/** The push services answer 404 or 410 for a subscription that is gone. */
export function isGoneStatus(status: unknown): boolean {
  return status === 404 || status === 410
}

/**
 * Sends push messages with the Web Push protocol. The library call is given
 * in, so this can be tested without the network.
 */
export function createWebPushSender(
  vapid: VapidConfig,
  sendNotification: SendNotification
): PushSender {
  return {
    async send(target, payload) {
      try {
        await sendNotification(target, serializePushPayload(payload), {
          // A reminder is about now: after an hour it is no longer useful.
          TTL: reminderTtlSeconds,
          urgency: "normal",
          vapidDetails: vapid,
        })
        return { status: "sent" }
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "statusCode" in error
            ? error.statusCode
            : undefined
        if (isGoneStatus(status)) return { status: "gone" }
        return {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  }
}
