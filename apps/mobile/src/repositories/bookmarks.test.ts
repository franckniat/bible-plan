import { describe, expect, it, vi } from "vitest"

import { testDatabase } from "@/db/test-database"

import { listBookmarks, toggleBookmark } from "./bookmarks"

vi.mock("@/db/client", () => ({ getDatabase: () => undefined }))

describe("bookmarks", () => {
  it("adds a passage, the latest first, and removes it on a second toggle", async () => {
    const db = await testDatabase()
    expect(
      toggleBookmark(db, "John.3", new Date("2026-11-03T08:00:00.000Z"))
    ).toBe(true)
    toggleBookmark(db, "Ps.23", new Date("2026-11-03T09:00:00.000Z"))
    expect(listBookmarks(db).map((bookmark) => bookmark.slug)).toEqual([
      "Ps.23",
      "John.3",
    ])
    expect(toggleBookmark(db, "John.3")).toBe(false)
    expect(listBookmarks(db).map((bookmark) => bookmark.slug)).toEqual([
      "Ps.23",
    ])
  })
})
