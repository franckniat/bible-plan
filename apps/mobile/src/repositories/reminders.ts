import {
  maxRemindersPerUser,
  reminderInputSchema,
  type ReminderInput,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import { asc, count, eq } from "drizzle-orm"
import type { z } from "zod"

import { useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { reminders } from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { getProfile, updateProfile } from "./profile"
import { writeSynced } from "./write"

export type Reminder = typeof reminders.$inferSelect
export type ReminderError = "limit" | "not_found"

const reminderTables = ["reminder"]

function getReminder(db: Database, id: string): Reminder | undefined {
  return db.select().from(reminders).where(eq(reminders.id, id)).get()
}

/** The reminders, earliest time of day first. */
export function listReminders(db: Database): Reminder[] {
  return db
    .select()
    .from(reminders)
    .orderBy(asc(reminders.localTime), asc(reminders.id))
    .all()
}

/**
 * Adds a reminder, or changes one (`existingId`), with the web's rules
 * (reminderInputSchema): a reminder of the phone notifies on it. Throws a
 * ZodError when it is invalid.
 */
export function saveReminder(
  db: Database,
  input: z.input<typeof reminderInputSchema>,
  existingId: string | null,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): { ok: true; id: string } | { ok: false; error: ReminderError } {
  const { timeZone, ...fields }: ReminderInput =
    reminderInputSchema.parse(input)
  const current = existingId ? getReminder(db, existingId) : undefined
  if (existingId && !current) return { ok: false, error: "not_found" }
  if (!current) {
    const total = db.select({ count: count() }).from(reminders).get()
    if ((total?.count ?? 0) >= maxRemindersPerUser) {
      return { ok: false, error: "limit" }
    }
  }
  const record: SyncRecord<"reminder"> = {
    ...fields,
    id: current?.id ?? id(),
    timezone: timeZone,
    updatedAt: now.toISOString(),
  }
  writeSynced(
    db,
    { table: "reminder", op: "upsert", record },
    (tx) =>
      tx
        .insert(reminders)
        .values(record)
        .onConflictDoUpdate({ target: reminders.id, set: record })
        .run(),
    now
  )
  return { ok: true, id: record.id }
}

export function deleteReminder(
  db: Database,
  reminderId: string,
  { now = new Date() }: { now?: Date } = {}
): void {
  if (!getReminder(db, reminderId)) return
  writeSynced(
    db,
    { table: "reminder", op: "delete", id: reminderId },
    (tx) => tx.delete(reminders).where(eq(reminders.id, reminderId)).run(),
    now
  )
}

export function useReminders(): Reminder[] {
  return useLocalQuery(reminderTables, () => listReminders(getDatabase()))
}

export function useReminder(id: string | undefined): Reminder | null {
  return useLocalQuery(
    reminderTables,
    () => (id ? (getReminder(getDatabase(), id) ?? null) : null),
    [id]
  )
}

/** The reminders' actions, for screens. */
export const reminderBook = {
  all: () => listReminders(getDatabase()),
  save: (input: z.input<typeof reminderInputSchema>, id: string | null) =>
    saveReminder(getDatabase(), input, id),
  remove: (id: string) => deleteReminder(getDatabase(), id),
}

/**
 * Follows the phone to another time zone: the profile takes it, and the
 * reminders set in the former one keep their local time in the new one (a
 * 07:00 reminder still rings at 07:00 where the phone is). Gives whether
 * anything changed.
 */
export function followTimeZone(
  db: Database,
  timeZone: string,
  { now = new Date() }: { now?: Date } = {}
): boolean {
  const former = getProfile(db).timeZone
  if (former === timeZone) return false
  updateProfile(db, { timeZone })
  for (const reminder of db
    .select()
    .from(reminders)
    .where(eq(reminders.timezone, former))
    .all()) {
    const record = {
      ...reminder,
      timezone: timeZone,
      updatedAt: now.toISOString(),
    }
    writeSynced(
      db,
      { table: "reminder", op: "upsert", record },
      (tx) =>
        tx
          .update(reminders)
          .set({ timezone: timeZone, updatedAt: record.updatedAt })
          .where(eq(reminders.id, reminder.id))
          .run(),
      now
    )
  }
  return true
}

/** Follows the phone's time zone (when the app opens or comes back). */
export function followPhoneTimeZone(timeZone: string): boolean {
  return followTimeZone(getDatabase(), timeZone)
}
