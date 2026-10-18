import { createHash, timingSafeEqual } from "node:crypto"

const digest = (value: string) => createHash("sha256").update(value).digest()

/**
 * Whether a request carries the cron secret as a bearer token. The compare is
 * constant time (on digests, so lengths do not matter). Without a configured
 * secret nothing is authorised.
 */
export function isAuthorizedCron(
  request: Request,
  secret: string | undefined
): boolean {
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  return timingSafeEqual(digest(token), digest(secret))
}
