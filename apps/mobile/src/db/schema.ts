import {
  catchUpStrategies,
  focusModes,
  prayerCategories,
  prayerStatuses,
  reminderKinds,
  sessionKinds,
  type ReminderChannel,
  type Weekday,
} from "@workspace/core"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/**
 * The local database: the source of truth of every screen, with or without an
 * account (PLAN-MOBILE.md, section 1). Dates are ISO strings, ids UUIDv7 made
 * on the phone. After a change here, run `pnpm db:generate`.
 */

/**
 * The person on this phone, without an account: one row. Sync settings come
 * with the account (M16).
 */
export const profile = sqliteTable("profile", {
  /** Always "local". */
  id: text("id").primaryKey(),
  /** Identifies this phone; never sent without an account. */
  deviceId: text("device_id").notNull(),
  /** Null follows the phone's language. */
  locale: text("locale", { enum: ["fr", "en"] }),
  timeZone: text("time_zone").notNull(),
  /** Null takes the version of the app's language. */
  bibleVersion: text("bible_version"),
  readingSpeed: text("reading_speed", { enum: ["slow", "normal", "fast"] })
    .notNull()
    .default("normal"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

/**
 * Every local change, in order, as the sync will push it
 * (@workspace/sync SyncChange). Written even without an account: creating
 * one pushes the whole history at once (the adoption).
 */
export const outbox = sqliteTable("outbox", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  table: text("table").notNull(),
  recordId: text("record_id").notNull(),
  op: text("op", { enum: ["upsert", "delete"] }).notNull(),
  /** The record as JSON for an upsert; null for a delete. */
  data: text("data"),
  clientUpdatedAt: text("client_updated_at").notNull(),
})

/**
 * Highlighted verses, numbered like the canon (synced, @workspace/sync
 * "highlight"): one color per verse.
 */
export const highlights = sqliteTable(
  "highlights",
  {
    id: text("id").primaryKey(),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    color: text("color", {
      enum: ["YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE", "PINK"],
    }).notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("highlights_verse").on(table.book, table.chapter, table.verse),
  ]
)

/**
 * Reading plans made on this phone (synced as one whole with their days and
 * readings, @workspace/sync "readingPlan"). Tracks and pace are the
 * generator's input, kept to rebuild the plan (catch-up).
 */
export const readingPlans = sqliteTable("reading_plans", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  templateKey: text("template_key"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  activeWeekdays: text("active_weekdays", { mode: "json" })
    .$type<Weekday[]>()
    .notNull(),
  tracks: text("tracks", { mode: "json" }).$type<unknown>().notNull(),
  pace: text("pace", { mode: "json" }).$type<unknown>().notNull(),
  totalDays: integer("total_days").notNull(),
  totalVerses: integer("total_verses").notNull(),
  totalReadings: integer("total_readings").notNull(),
  catchUpStrategy: text("catch_up_strategy", {
    enum: catchUpStrategies,
  }).notNull(),
  groupId: text("group_id"),
  updatedAt: text("updated_at").notNull(),
})

/** A plan's reading days. */
export const planDays = sqliteTable(
  "plan_days",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => readingPlans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    date: text("date").notNull(),
    verses: integer("verses").notNull(),
  },
  (table) => [uniqueIndex("plan_days_number").on(table.planId, table.dayNumber)]
)

/** A day's readings, numbered like the canon. */
export const planReadings = sqliteTable(
  "plan_readings",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => planDays.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    track: integer("track").notNull(),
    book: text("book").notNull(),
    startChapter: integer("start_chapter").notNull(),
    startVerse: integer("start_verse").notNull(),
    endChapter: integer("end_chapter").notNull(),
    endVerse: integer("end_verse").notNull(),
    verses: integer("verses").notNull(),
  },
  (table) => [index("plan_readings_day").on(table.dayId)]
)

/** The plans followed on this phone (synced, "planEnrollment"). */
export const planEnrollments = sqliteTable(
  "plan_enrollments",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => readingPlans.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["ACTIVE", "PAUSED", "ARCHIVED"] })
      .notNull()
      .default("ACTIVE"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("plan_enrollments_plan").on(table.planId)]
)

/** Readings marked as read (synced, "readingProgress"): one per reading. */
export const readingProgress = sqliteTable(
  "reading_progress",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => planEnrollments.id, { onDelete: "cascade" }),
    readingId: text("reading_id")
      .notNull()
      .references(() => planReadings.id, { onDelete: "cascade" }),
    completedAt: text("completed_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("reading_progress_reading").on(
      table.enrollmentId,
      table.readingId
    ),
  ]
)

/** Prayer requests of the journal (synced, "prayerRequest"). */
export const prayerRequests = sqliteTable("prayer_requests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  details: text("details"),
  category: text("category", { enum: prayerCategories }).notNull(),
  status: text("status", { enum: prayerStatuses }).notNull(),
  startedOn: text("started_on").notNull(),
  /** Passage slugs, as JSON. */
  passages: text("passages", { mode: "json" }).$type<string[]>().notNull(),
  lastPrayedAt: text("last_prayed_at"),
  prayerCount: integer("prayer_count").notNull(),
  answeredOn: text("answered_on"),
  answerNote: text("answer_note"),
  groupId: text("group_id"),
  updatedAt: text("updated_at").notNull(),
})

/** Each "I prayed" (synced, "prayerLog"), for the statistics. */
export const prayerLogs = sqliteTable(
  "prayer_logs",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    prayedAt: text("prayed_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("prayer_logs_request").on(table.requestId)]
)

/** Finished meditation and prayer sessions (synced, "meditationSession"). */
export const meditationSessions = sqliteTable("meditation_sessions", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: sessionKinds }).notNull(),
  /** Passage slug, or null. */
  passage: text("passage"),
  plannedSeconds: integer("planned_seconds").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  startedAt: text("started_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

/** Meditation notes on a passage (synced, "meditationNote"). */
export const meditationNotes = sqliteTable("meditation_notes", {
  id: text("id").primaryKey(),
  /** The book of the passage, to filter the notes. */
  book: text("book").notNull(),
  /** Passage slugs. */
  passage: text("passage").notNull(),
  keyVerse: text("key_verse"),
  reflection: text("reflection"),
  application: text("application"),
  sessionId: text("session_id"),
  updatedAt: text("updated_at").notNull(),
})

/** Reading, prayer and meditation reminders (synced, "reminder"). */
export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: reminderKinds }).notNull(),
  /** "07:30", in `timezone`. */
  localTime: text("local_time").notNull(),
  timezone: text("timezone").notNull(),
  weekdays: text("weekdays", { mode: "json" }).$type<Weekday[]>().notNull(),
  channels: text("channels", { mode: "json" })
    .$type<ReminderChannel[]>()
    .notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  leadMinutes: integer("lead_minutes").notNull(),
  /** A prayer time's length; null for a plain reminder. */
  durationMinutes: integer("duration_minutes"),
  focusMode: text("focus_mode", { enum: focusModes }).notNull(),
  updatedAt: text("updated_at").notNull(),
})

/**
 * The reminders scheduled on this phone, for the notification centre: those
 * due are listed (not synced, as on the web each device has its own).
 */
export const notificationLog = sqliteTable(
  "notification_log",
  {
    /** The id of the scheduled notification. */
    id: text("id").primaryKey(),
    kind: text("kind", { enum: reminderKinds }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    /** When it rings. */
    at: text("at").notNull(),
    readAt: text("read_at"),
  },
  (table) => [index("notification_log_at").on(table.at)]
)
