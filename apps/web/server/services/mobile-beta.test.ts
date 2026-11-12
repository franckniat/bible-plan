import { describe, expect, it } from "vitest"

import { latestMobileBeta } from "./mobile-beta"

const release = (tag: string, assets = [`${tag}.apk`], draft = false) => ({
  tag_name: tag,
  html_url: `https://github.com/r/releases/tag/${tag}`,
  draft,
  published_at: "2026-11-12T09:44:55Z",
  assets: assets.map((name) => ({
    name,
    browser_download_url: `https://github.com/r/releases/download/${tag}/${name}`,
  })),
})

describe("latestMobileBeta", () => {
  it("takes the newest Android beta with its APK", () => {
    expect(
      latestMobileBeta([
        release("v1.2.0"),
        release("mobile-v0.0.1-beta.3", [], false),
        release("mobile-v0.0.1-beta.2", ["notes.txt", "bible-plan.apk"]),
        release("mobile-v0.0.1-beta.1"),
      ])
    ).toEqual({
      version: "0.0.1 beta 2",
      apkUrl:
        "https://github.com/r/releases/download/mobile-v0.0.1-beta.2/bible-plan.apk",
      releaseUrl: "https://github.com/r/releases/tag/mobile-v0.0.1-beta.2",
      publishedAt: "2026-11-12T09:44:55Z",
    })
  })

  it("gives nothing without a published beta", () => {
    expect(latestMobileBeta([])).toBeNull()
    expect(
      latestMobileBeta([release("mobile-v0.0.1-beta.1", undefined, true)])
    ).toBeNull()
  })
})
