import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"

import type * as schema from "./schema"

/**
 * The local database, whatever runs it: expo-sqlite on the phone, sql.js in
 * the browser preview and in tests. Both are synchronous SQLite drivers.
 */
export type Database = BaseSQLiteDatabase<"sync", unknown, typeof schema>
