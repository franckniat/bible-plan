import "server-only"

/**
 * The public VAPID key the browser subscribes with, or null while push is not
 * configured (no key pair): the settings then do not offer notifications.
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}
