import { z } from "zod"

/**
 * Push services a browser can hand out an endpoint of. The server posts to
 * the endpoint it is given, so only these hosts are accepted (and only over
 * https): anything else could make the server call an address of someone
 * else's choosing.
 */
const pushServiceHosts = [
  "fcm.googleapis.com", // Chrome, Edge, Android
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari, iOS home screen apps
  "notify.windows.com", // Windows (regional hosts end with it)
  "push.apple.com",
] as const

/**
 * Whether a subscription endpoint is an https address of a known push
 * service. The host is read with a pattern that has no room for credentials
 * ("user@"), a port or brackets, so what is checked is what would be called.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  const match =
    /^https:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:[/?#][^\s\\]*)?$/i.exec(
      endpoint
    )
  if (!match) return false
  const hostname = match[1]!.toLowerCase()
  return pushServiceHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  )
}

const base64Url = /^[A-Za-z0-9_-]+={0,2}$/

/** A browser subscription (`PushSubscription.toJSON()`), as sent to the server. */
export const webPushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine(isAllowedPushEndpoint, { error: "Unknown push service" }),
  keys: z.object({
    // 65 bytes (an uncompressed P-256 point) and 16 bytes, base64url.
    p256dh: z.string().regex(base64Url).min(80).max(100),
    auth: z.string().regex(base64Url).min(16).max(30),
  }),
})

export type WebPushSubscription = z.infer<typeof webPushSubscriptionSchema>

/** Unsubscribing only needs to know which subscription. */
export const pushEndpointSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine(isAllowedPushEndpoint, { error: "Unknown push service" }),
})
