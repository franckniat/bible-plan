import type { BibleVersionId } from "@workspace/bible-data"
import type { Locale, ReadingSpeed } from "@workspace/core"
import { eq } from "drizzle-orm"

import { notifyChange, useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { profile } from "@/db/schema"
import type { Database } from "@/db/types"
import { readableVersions } from "@/bible/versions"
import { newId } from "@/lib/ids"
import { getPreferences } from "@/lib/preferences"

/**
 * The version chosen, when the phone can read it, or the one of the app's
 * language (as on the web).
 */
export function bibleVersionOf(
  chosen: string | null,
  locale: Locale
): BibleVersionId {
  return (
    readableVersions(getPreferences().downloaded).find((id) => id === chosen) ??
    (locale === "fr" ? "lsg1910" : "kjv")
  )
}

export type Profile = typeof profile.$inferSelect

/** The person on this phone is a single row. */
const profileId = "local"

/** The settings a person changes in the app. */
export type ProfileChange = Partial<{
  locale: Locale | null
  bibleVersion: BibleVersionId | null
  readingSpeed: ReadingSpeed
  timeZone: string
}>

/** The phone's time zone, UTC when it cannot tell. */
export function phoneTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/**
 * Creates the local profile on the first launch, without any network: an id
 * for this phone, its time zone, and the settings already chosen (`seed`).
 * Does nothing when it exists. Gives the profile.
 */
export function ensureProfile(
  db: Database,
  {
    now = new Date(),
    timeZone = phoneTimeZone(),
    deviceId = newId,
    seed = {},
  }: {
    now?: Date
    timeZone?: string
    deviceId?: () => string
    seed?: ProfileChange
  } = {}
): Profile {
  const existing = db
    .select()
    .from(profile)
    .where(eq(profile.id, profileId))
    .get()
  if (existing) return existing
  const at = now.toISOString()
  db.insert(profile)
    .values({
      id: profileId,
      deviceId: deviceId(),
      timeZone,
      ...seed,
      createdAt: at,
      updatedAt: at,
    })
    .run()
  notifyChange("profile")
  return db.select().from(profile).where(eq(profile.id, profileId)).get()!
}

export function getProfile(db: Database): Profile {
  const row = db.select().from(profile).where(eq(profile.id, profileId)).get()
  if (!row) throw new Error("The profile is created at startup")
  return row
}

/** Changes settings of the profile; the screens showing them refresh. */
export function updateProfile(
  db: Database,
  change: ProfileChange,
  now: Date = new Date()
): void {
  db.update(profile)
    .set({ ...change, updatedAt: now.toISOString() })
    .where(eq(profile.id, profileId))
    .run()
  notifyChange("profile")
}

/** The local profile, kept up to date. */
export function useProfile(): Profile {
  return useLocalQuery(["profile"], () => getProfile(getDatabase()))
}

/** Changes settings of the profile (for screens). */
export function setProfile(change: ProfileChange): void {
  updateProfile(getDatabase(), change)
}

/** Forgets the version chosen when it is this one (a removed download). */
export function unchooseVersion(version: BibleVersionId): void {
  const db = getDatabase()
  if (getProfile(db).bibleVersion === version) {
    updateProfile(db, { bibleVersion: null })
  }
}
