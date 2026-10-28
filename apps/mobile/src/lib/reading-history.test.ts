import { books } from "@workspace/core"
import { describe, expect, it, vi } from "vitest"

import { withReading } from "./reading-history"

// The preferences are kept by expo-sqlite, which needs the phone.
vi.mock("./preferences/storage", () => ({
  storage: { get: () => null, set: () => {} },
}))

describe("withReading", () => {
  it("puts the passage first, keeping one place per book", () => {
    const history = [
      { slug: "John.3", at: 2 },
      { slug: "Gen.1", at: 1 },
    ]
    expect(withReading(history, "Gen.2", 3)).toEqual([
      { slug: "Gen.2", at: 3 },
      { slug: "John.3", at: 2 },
    ])
  })

  it("keeps the twenty latest places", () => {
    const history = books
      .slice(0, 20)
      .map((book, index) => ({ slug: `${book.id}.1`, at: 20 - index }))
    const next = withReading(history, "Rev.1", 21)
    expect(next).toHaveLength(20)
    expect(next[0]).toEqual({ slug: "Rev.1", at: 21 })
    expect(next.at(-1)).toEqual(history[18])
  })
})
