import { createHmac, timingSafeEqual } from "node:crypto"

const purpose = "reminder-unsubscribe"

function signature(reminderId: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(`${purpose}:${reminderId}`)
    .digest()
}

/**
 * Token of an unsubscribe link: the reminder and a signature, so only the link
 * sent in the email can switch that reminder off. It does not expire: someone
 * must be able to unsubscribe from an old email.
 */
export function signReminderToken(reminderId: string, secret: string): string {
  return `${reminderId}.${signature(reminderId, secret).toString("base64url")}`
}

/** The reminder of a valid token, or null. */
export function verifyReminderToken(
  token: string,
  secret: string
): string | null {
  const separator = token.lastIndexOf(".")
  if (separator <= 0) return null
  const reminderId = token.slice(0, separator)
  const given = Buffer.from(token.slice(separator + 1), "base64url")
  const expected = signature(reminderId, secret)
  // Constant time, and the lengths are checked first (timingSafeEqual throws).
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? reminderId
    : null
}

/** The unsubscribe link of a reminder email, on the public URL of the app. */
export function reminderUnsubscribeUrl(
  reminderId: string,
  { baseUrl, secret }: { baseUrl: string; secret: string }
): string {
  const url = new URL("/api/reminders/unsubscribe", baseUrl)
  url.searchParams.set("token", signReminderToken(reminderId, secret))
  return url.toString()
}

/**
 * Headers that let mail apps offer an "unsubscribe" button (RFC 8058): the
 * link, and the one-click POST to the same address.
 */
export function unsubscribeHeaders(unsubscribeUrl: string) {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}
