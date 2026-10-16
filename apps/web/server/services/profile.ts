import "server-only"

import type { ProfileSettings } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type ProfileDb = Pick<PrismaClient, "user">

/** Saves the profile settings of a user. */
export async function updateProfile(
  db: ProfileDb,
  userId: string,
  settings: ProfileSettings
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      name: settings.name,
      locale: settings.locale,
      timezone: settings.timezone,
      readingWpm: settings.readingWpm,
    },
  })
}

/**
 * Sets the time zone detected by the browser, unless the user already has
 * one (detected earlier or chosen in the settings).
 */
export async function setDetectedTimeZone(
  db: ProfileDb,
  userId: string,
  timezone: string
): Promise<void> {
  await db.user.updateMany({
    where: { id: userId, timezone: null },
    data: { timezone },
  })
}

/** Saves the Bible version the user reads in. */
export async function setBibleVersion(
  db: ProfileDb,
  userId: string,
  version: string
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { bibleVersion: version },
  })
}
