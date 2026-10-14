import { describe, expect, it, vi } from "vitest"

import { updateProfile, type ProfileDb } from "./profile"

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
