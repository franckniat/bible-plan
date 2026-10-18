import { describe, expect, it, vi } from "vitest"

import {
  importHighlights,
  listHighlights,
  setHighlights,
  type HighlightsDb,
} from "./highlights"

function db(highlight: Record<string, unknown>) {
  const transaction = vi.fn(async (operations: unknown[]) => operations)
  return {
    typed: { highlight, $transaction: transaction } as unknown as HighlightsDb,
    transaction,
  }
}

describe("listHighlights", () => {
  it("reads only the highlights of the user in the chapters asked for", async () => {
    const highlight = { findMany: vi.fn().mockResolvedValue([]) }
    await listHighlights(db(highlight).typed, "user-1", "John", [3, 4])
    expect(highlight.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", book: "John", chapter: { in: [3, 4] } },
      select: { book: true, chapter: true, verse: true, color: true },
      orderBy: [{ chapter: "asc" }, { verse: "asc" }],
    })
  })
})

describe("setHighlights", () => {
  it("colors each verse, replacing a color already there", async () => {
    const highlight = { upsert: vi.fn((args) => args) }
    const { typed, transaction } = db(highlight)
    await setHighlights(typed, "user-1", {
      book: "John",
      chapter: 3,
      verses: [16, 18],
      color: "GREEN",
    })

    expect(highlight.upsert).toHaveBeenCalledTimes(2)
    expect(highlight.upsert).toHaveBeenCalledWith({
      where: {
        userId_book_chapter_verse: {
          userId: "user-1",
          book: "John",
          chapter: 3,
          verse: 18,
        },
      },
      create: {
        userId: "user-1",
        book: "John",
        chapter: 3,
        verse: 18,
        color: "GREEN",
      },
      update: { color: "GREEN" },
    })
    // All or none.
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it("removes the color of the verses of the user only", async () => {
    const highlight = { deleteMany: vi.fn(), upsert: vi.fn() }
    const { typed, transaction } = db(highlight)
    await setHighlights(typed, "user-1", {
      book: "John",
      chapter: 3,
      verses: [16],
      color: null,
    })
    expect(highlight.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        book: "John",
        chapter: 3,
        verse: { in: [16] },
      },
    })
    expect(highlight.upsert).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })
})

describe("importHighlights", () => {
  it("adds the device's highlights without touching those of the account", async () => {
    const highlight = { createMany: vi.fn().mockResolvedValue({ count: 1 }) }
    const added = await importHighlights(db(highlight).typed, "user-1", [
      { book: "John", chapter: 3, verse: 16, color: "YELLOW" },
      { book: "Ps", chapter: 23, verse: 1, color: "BLUE" },
    ])
    expect(added).toBe(1)
    expect(highlight.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          book: "John",
          chapter: 3,
          verse: 16,
          color: "YELLOW",
        },
        { userId: "user-1", book: "Ps", chapter: 23, verse: 1, color: "BLUE" },
      ],
      // A verse the account already colored keeps its color.
      skipDuplicates: true,
    })
  })
})
