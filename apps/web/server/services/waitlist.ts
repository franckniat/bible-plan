import "server-only"

import type { WaitlistInterest, WaitlistSignup } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type WaitlistDb = Pick<PrismaClient, "waitlistEntry">

const toDbInterest = (interest: WaitlistInterest) =>
  interest.toUpperCase() as Uppercase<WaitlistInterest>

/**
 * Adds a person to the waitlist. Signing up again with the same email updates
 * the details that were provided and never reveals that the email already
 * existed (the caller always answers with the same success message).
 */
export async function joinWaitlist(
  db: WaitlistDb,
  signup: WaitlistSignup,
  { ipHash, now = new Date() }: { ipHash?: string; now?: Date } = {}
): Promise<void> {
  const interests = signup.interests.map(toDbInterest)

  await db.waitlistEntry.upsert({
    where: { email: signup.email },
    create: {
      email: signup.email,
      firstName: signup.firstName,
      countryCode: signup.country,
      interests,
      locale: signup.locale,
      consentedAt: now,
      ipHash,
    },
    // `undefined` leaves a column unchanged: details given earlier are kept.
    update: {
      firstName: signup.firstName,
      countryCode: signup.country,
      interests: interests.length ? interests : undefined,
      locale: signup.locale,
      consentedAt: now,
    },
  })
}

/** Number of people on the waitlist (shown on the landing page). */
export function countWaitlistEntries(db: WaitlistDb): Promise<number> {
  return db.waitlistEntry.count()
}

/** Signups recorded from the same (hashed) IP address since a given date. */
export function countSignupsFromIp(
  db: WaitlistDb,
  ipHash: string,
  since: Date
): Promise<number> {
  return db.waitlistEntry.count({
    where: { ipHash, createdAt: { gte: since } },
  })
}
