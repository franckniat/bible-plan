import { beforeEach, describe, expect, it, vi } from "vitest"

const saved = vi.hoisted(() => new Map<string, string>())

vi.mock("./storage", () => ({
  storage: {
    get: (key: string) => saved.get(key) ?? null,
    set: (key: string, value: string) => saved.set(key, value),
  },
}))

async function load() {
  vi.resetModules()
  return import("./index")
}

describe("preferences", () => {
  beforeEach(() => saved.clear())

  it("starts from the defaults", async () => {
    const { getPreferences } = await load()
    expect(getPreferences()).toEqual({
      onboarded: false,
      locale: null,
      bibleVersion: null,
      readingSpeed: "normal",
      reminder: "morning",
    })
  })

  it("keeps what is saved across launches", async () => {
    const first = await load()
    first.setPreferences({ onboarded: true, locale: "en", reminder: "none" })
    const { getPreferences } = await load()
    expect(getPreferences()).toMatchObject({
      onboarded: true,
      locale: "en",
      reminder: "none",
    })
  })

  it("replaces unreadable or unknown values by the defaults", async () => {
    saved.set("preferences", '{"locale":"de","readingSpeed":"sprint"}')
    expect((await load()).getPreferences()).toMatchObject({
      locale: null,
      readingSpeed: "normal",
    })
    saved.set("preferences", "not json")
    expect((await load()).getPreferences().onboarded).toBe(false)
  })
})
