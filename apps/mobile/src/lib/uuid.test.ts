import { clientIdSchema } from "@workspace/core"
import { describe, expect, it } from "vitest"

import { uuidv7 } from "./uuid"

const random = (seed: number) =>
  Uint8Array.from({ length: 10 }, (_, index) => (seed * 31 + index * 97) % 256)

describe("uuidv7", () => {
  it("makes an id the server accepts", () => {
    for (let seed = 0; seed < 50; seed++) {
      const id = uuidv7(Date.parse("2026-10-27T08:00:00Z"), random(seed))
      expect(clientIdSchema.safeParse(id).success).toBe(true)
    }
  })

  it("starts with the time, so ids sort by creation", () => {
    const earlier = uuidv7(Date.parse("2026-10-27T08:00:00Z"), random(1))
    const later = uuidv7(Date.parse("2026-10-27T08:00:00.001Z"), random(0))
    expect(earlier < later).toBe(true)
    // 2026-10-27T08:00:00Z is 0x01a17c5f9000 ms after 1970.
    expect(earlier.slice(0, 13)).toBe("01a17c5f-9000")
  })

  it("keeps the randomness apart from the version and variant", () => {
    const id = uuidv7(0, new Uint8Array(10).fill(0xff))
    expect(id).toBe("00000000-0000-7fff-bfff-ffffffffffff")
  })
})
