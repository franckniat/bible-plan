import { describe, expect, it } from "vitest"

import { parseReference } from "@workspace/core"

import {
  externalVersionUrl,
  externalVersions,
  getExternalVersion,
  isExternalVersionId,
} from "../src/external-versions"
import { bibleVersions } from "../src/versions"

const passage = (reference: string) => parseReference(reference)![0]!

describe("external versions", () => {
  it("lists the translations that are not hosted, with their rights holder", () => {
    expect(externalVersions.map((version) => version.id)).toEqual([
      "pdv2017",
      "bds",
      "s21",
      "nfc",
      "niv",
      "nlt",
      "nkjv",
    ])
    expect(externalVersions.every((version) => version.publisher)).toBe(true)
  })

  it("does not overlap the versions hosted in the app", () => {
    const hosted = new Set(bibleVersions.map((version) => version.id as string))
    expect(
      externalVersions.filter((version) => hosted.has(version.id))
    ).toEqual([])
  })

  it("has a different id and YouVersion id for each", () => {
    expect(new Set(externalVersions.map((v) => v.id)).size).toBe(
      externalVersions.length
    )
    expect(new Set(externalVersions.map((v) => v.youVersion.id)).size).toBe(
      externalVersions.length
    )
  })

  it("recognises its ids", () => {
    expect(isExternalVersionId("niv")).toBe(true)
    expect(isExternalVersionId("kjv")).toBe(false)
    expect(getExternalVersion("s21").name).toBe("La Bible Segond 21")
  })
})

describe("externalVersionUrl", () => {
  it.each([
    ["Jn 3:16", "niv", "https://www.bible.com/bible/111/JHN.3.16.NIV"],
    ["Jn 3:16-18", "nlt", "https://www.bible.com/bible/116/JHN.3.16-18.NLT"],
    ["Rm 8", "nkjv", "https://www.bible.com/bible/114/ROM.8.NKJV"],
    ["Ph 4:19", "pdv2017", "https://www.bible.com/bible/133/PHP.4.19.PDV2017"],
    // Several chapters: the first one, here a whole chapter.
    ["Jn 1:1-2:3", "s21", "https://www.bible.com/bible/152/JHN.1.S21"],
  ])("opens %s in %s", (reference, id, url) => {
    expect(externalVersionUrl(passage(reference), id as never)).toBe(url)
  })

  it("opens a psalm as a whole chapter, whatever the verses", () => {
    expect(externalVersionUrl(passage("Ps 51:3-4"), "bds")).toBe(
      "https://www.bible.com/bible/21/PSA.51.BDS"
    )
  })
})
