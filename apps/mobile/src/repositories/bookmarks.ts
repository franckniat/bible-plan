import { desc, eq } from "drizzle-orm"

import { notifyChange, useLocalQuery } from "@/db/changes"
import { getDatabase } from "@/db/client"
import { bookmarks } from "@/db/schema"
import type { Database } from "@/db/types"

export type Bookmark = typeof bookmarks.$inferSelect

const tables = ["bookmark"]

/** The passages bookmarked, the latest first. */
export function listBookmarks(db: Database): Bookmark[] {
  return db.select().from(bookmarks).orderBy(desc(bookmarks.createdAt)).all()
}

/** Bookmarks a passage, or removes its bookmark. Gives whether it now has one. */
export function toggleBookmark(
  db: Database,
  slug: string,
  now: Date = new Date()
): boolean {
  const current = db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.slug, slug))
    .get()
  if (current) db.delete(bookmarks).where(eq(bookmarks.slug, slug)).run()
  else db.insert(bookmarks).values({ slug, createdAt: now.toISOString() }).run()
  notifyChange(...tables)
  return !current
}

export function useBookmarks(): Bookmark[] {
  return useLocalQuery(tables, () => listBookmarks(getDatabase()))
}

/** Bookmarks a passage or removes its bookmark (for screens). */
export function flipBookmark(slug: string): boolean {
  return toggleBookmark(getDatabase(), slug)
}
