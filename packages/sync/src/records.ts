import {
  catchUpStrategies,
  focusModes,
  highlightColors,
  isoDateSchema,
  prayerCategories,
  prayerStatuses,
  reminderChannels,
  reminderKinds,
  sessionKinds,
  timeOfDaySchema,
  timeZoneSchema,
  weekdaysSchema,
} from "@workspace/core"
import { z } from "zod"

/**
 * The records the phone and the server exchange, one schema per synced table,
 * in the same shape on both sides. Dates travel as ISO strings. Ids are UUIDs
 * (version 7 when the phone makes them), so a record keeps its id everywhere.
 */

const id = z.uuid()
const dateTime = z.iso.datetime()

/** A plan's reading, inside its day. */
export const planReadingRecordSchema = z.object({
  id,
  position: z.int().min(0),
  track: z.int().min(0),
  book: z.string().min(1).max(8),
  startChapter: z.int().min(1),
  startVerse: z.int().min(1),
  endChapter: z.int().min(1),
  endVerse: z.int().min(1),
  verses: z.int().min(0),
})

/** A plan's day, inside its plan. */
export const planDayRecordSchema = z.object({
  id,
  dayNumber: z.int().min(1),
  date: isoDateSchema,
  verses: z.int().min(0),
  readings: z.array(planReadingRecordSchema),
})

/**
 * A reading plan with its days and readings: they are synced as one whole
 * (an aggregate), so a catch-up made offline replaces the plan at once.
 */
export const readingPlanRecordSchema = z.object({
  id,
  title: z.string().min(1).max(200),
  templateKey: z.string().max(100).nullable(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  activeWeekdays: weekdaysSchema,
  tracks: z.unknown(),
  pace: z.unknown(),
  totalDays: z.int().min(0),
  totalVerses: z.int().min(0),
  totalReadings: z.int().min(0),
  catchUpStrategy: z.enum(catchUpStrategies),
  groupId: id.nullable(),
  updatedAt: dateTime,
  days: z.array(planDayRecordSchema),
})

export const planEnrollmentRecordSchema = z.object({
  id,
  planId: id,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
  updatedAt: dateTime,
})

export const readingProgressRecordSchema = z.object({
  id,
  enrollmentId: id,
  readingId: id,
  completedAt: dateTime,
  updatedAt: dateTime,
})

export const prayerRequestRecordSchema = z.object({
  id,
  title: z.string().min(1).max(200),
  details: z.string().max(4000).nullable(),
  category: z.enum(prayerCategories),
  status: z.enum(prayerStatuses),
  startedOn: isoDateSchema,
  passages: z.array(z.string()).max(10),
  lastPrayedAt: dateTime.nullable(),
  prayerCount: z.int().min(0),
  answeredOn: isoDateSchema.nullable(),
  answerNote: z.string().max(4000).nullable(),
  groupId: id.nullable(),
  updatedAt: dateTime,
})

export const prayerLogRecordSchema = z.object({
  id,
  requestId: id,
  prayedAt: dateTime,
  updatedAt: dateTime,
})

export const meditationSessionRecordSchema = z.object({
  id,
  kind: z.enum(sessionKinds),
  passage: z.string().nullable(),
  plannedSeconds: z.int().min(0),
  durationSeconds: z.int().min(0),
  startedAt: dateTime,
  updatedAt: dateTime,
})

export const meditationNoteRecordSchema = z.object({
  id,
  book: z.string().min(1).max(8),
  passage: z.string().min(1),
  keyVerse: z.string().nullable(),
  reflection: z.string().nullable(),
  application: z.string().nullable(),
  sessionId: id.nullable(),
  updatedAt: dateTime,
})

export const highlightRecordSchema = z.object({
  id,
  book: z.string().min(1).max(8),
  chapter: z.int().min(1),
  verse: z.int().min(1),
  color: z.enum(highlightColors),
  updatedAt: dateTime,
})

export const reminderRecordSchema = z.object({
  id,
  kind: z.enum(reminderKinds),
  localTime: timeOfDaySchema,
  timezone: timeZoneSchema,
  weekdays: weekdaysSchema,
  channels: z.array(z.enum(reminderChannels)),
  enabled: z.boolean(),
  leadMinutes: z.int().min(0),
  durationMinutes: z.int().min(1).nullable(),
  focusMode: z.enum(focusModes),
  updatedAt: dateTime,
})

export const achievementRecordSchema = z.object({
  id,
  key: z.string().min(1).max(100),
  level: z.int().min(1).max(3),
  unlockedAt: isoDateSchema,
  updatedAt: dateTime,
})

/** Every synced table, with the schema of its records. */
export const recordSchemas = {
  readingPlan: readingPlanRecordSchema,
  planEnrollment: planEnrollmentRecordSchema,
  readingProgress: readingProgressRecordSchema,
  prayerRequest: prayerRequestRecordSchema,
  prayerLog: prayerLogRecordSchema,
  meditationSession: meditationSessionRecordSchema,
  meditationNote: meditationNoteRecordSchema,
  highlight: highlightRecordSchema,
  reminder: reminderRecordSchema,
  achievement: achievementRecordSchema,
} as const

export type SyncTable = keyof typeof recordSchemas
export const syncTables = Object.keys(recordSchemas) as SyncTable[]

export type SyncRecord<T extends SyncTable = SyncTable> = z.infer<
  (typeof recordSchemas)[T]
>
