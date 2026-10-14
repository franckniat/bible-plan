import { describe, expect, it, vi } from "vitest"

import { setDetectedTimeZone, updateProfile, type ProfileDb } from "./profile"

describe("updateProfile", () => {
  it("updates only the settings of the given user", async () => {
    const user = { update: vi.fn() }
    await updateProfile({ user } as unknown as ProfileDb, "user-1", {
      name: "Manuel",
      locale: "en",
      timezone: "Africa/Douala",
      readingWpm: 240,
    })

    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        name: "Manuel",
        locale: "en",
        timezone: "Africa/Douala",
        readingWpm: 240,
      },
    })
  })
})

describe("setDetectedTimeZone", () => {
  it("only fills a missing time zone", async () => {
    const user = { updateMany: vi.fn() }
    await setDetectedTimeZone(
      { user } as unknown as ProfileDb,
      "user-1",
      "Europe/Paris"
    )

    expect(user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", timezone: null },
      data: { timezone: "Europe/Paris" },
    })
  })
})
