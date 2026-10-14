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
