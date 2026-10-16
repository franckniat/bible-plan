import { describe, expect, it } from "vitest"

import { bookIds, parseReference } from "@workspace/core"

import { usfmCode, youVersionUrl } from "./youversion"

const passage = (reference: string) => parseReference(reference)![0]!

describe("youVersionUrl", () => {
  it.each([
    ["Jn 3:16", "kjv", "https://www.bible.com/bible/1/JHN.3.16.KJV"],
    ["Ps 23:1-3", "kjv", "https://www.bible.com/bible/1/PSA.23.1-3.KJV"],
    ["Jn 3", "lsg1910", "https://www.bible.com/bible/93/JHN.3.LSG"],
    // Several chapters: bible.com opens the first one.
    ["Gn 1-3", "lsg1910", "https://www.bible.com/bible/93/GEN.1.LSG"],
    // LSG numbering: Psalm 51:1-2 is the title, the canon 51:1 is LSG 51:3.
    ["Ps 51:1", "lsg1910", "https://www.bible.com/bible/93/PSA.51.1-3.LSG"],
    ["Ps 51:3-4", "lsg1910", "https://www.bible.com/bible/93/PSA.51.5-6.LSG"],
    ["Ct 1", "kjv", "https://www.bible.com/bible/1/SNG.1.KJV"],
  ] as const)("links %s (%s)", (reference, version, url) => {
    expect(youVersionUrl(passage(reference), version)).toBe(url)
  })

  it("has a USFM code for every book", () => {
    const codes = bookIds.map(usfmCode)
    expect(new Set(codes).size).toBe(66)
    for (const code of codes) expect(code).toMatch(/^[1-3A-Z][A-Z0-9]{2}$/)
  })
})
