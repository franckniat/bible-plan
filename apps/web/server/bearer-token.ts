import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"

const digest = (value: string) => createHash("sha256").update(value).digest()

/**
 * Whether an `Authorization: Bearer <token>` header carries the expected
 * token, compared in constant time.
 */
export function hasBearerToken(
  authorization: string | null,
  expected: string
): boolean {
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1] || !expected) return false
  return timingSafeEqual(digest(match[1].trim()), digest(expected))
}
