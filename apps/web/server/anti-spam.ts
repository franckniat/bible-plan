import "server-only"

import { createHmac } from "node:crypto"

/** Maximum waitlist signups per (hashed) IP address and per hour. */
export const MAX_SIGNUPS_PER_IP_PER_HOUR = 5

/** Humans need at least this long to fill in the form. */
export const MIN_FILL_TIME_MS = 2_000

/** Hidden field that only bots fill in. */
export function isHoneypotFilled(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && value.trim() !== ""
}

/**
 * Whether the form was submitted faster than a human could fill it in.
 * `startedAt` is the timestamp (ms) set by the browser when the form appeared.
 */
export function isSubmittedTooFast(
  startedAt: FormDataEntryValue | null,
  now = Date.now()
): boolean {
  const start = Number(startedAt)
  if (!Number.isFinite(start) || start <= 0) return false
  return now - start < MIN_FILL_TIME_MS
}

/** Client IP address as forwarded by the hosting proxy (Vercel). */
export function getClientIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || headers.get("x-real-ip")?.trim() || undefined
}

/**
 * Keyed hash of an IP address: lets us count signups per address without
 * storing the address itself.
 */
export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex")
}

/** Secret used by `hashIp`; mandatory in production. */
export function getIpHashSecret(env = process.env): string {
  const secret = env.IP_HASH_SECRET
  if (secret) return secret
  if (env.NODE_ENV === "production") {
    throw new Error("IP_HASH_SECRET is not set (see apps/web/.env.example).")
  }
  return "development-only-ip-hash-secret"
}
