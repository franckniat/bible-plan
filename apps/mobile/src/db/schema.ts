import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
