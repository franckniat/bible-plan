import { describe, expect, it } from "vitest"

import { prayerRequestInputSchema } from "./schema"

const group = "01a15e0b-cd2d-70ef-8f9f-d4d62797933a"

describe("prayerRequestInputSchema and sharing", () => {
  it("leaves the group as it was when none is given", () => {
    const parsed = prayerRequestInputSchema.parse({ title: "Pour Marie" })
    expect(parsed.groupId).toBeUndefined()
  })

  it("keeps a request private with null, and shares it with a group id", () => {
    expect(
      prayerRequestInputSchema.parse({ title: "Pour Marie", groupId: null })
        .groupId
    ).toBeNull()
    expect(
      prayerRequestInputSchema.parse({ title: "Pour Marie", groupId: group })
        .groupId
    ).toBe(group)
  })

  it("refuses something that is not a group id", () => {
    expect(
      prayerRequestInputSchema.safeParse({ title: "Pour Marie", groupId: "x" })
        .success
    ).toBe(false)
  })
})
