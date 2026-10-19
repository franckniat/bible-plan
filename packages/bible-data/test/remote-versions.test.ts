import { describe, expect, it } from "vitest"

import {
  parseYouVersionChapter,
  remoteVersionConfigs,
} from "../src/remote-versions"

const verse = (n: number, text: string) =>
  `<span class="yv-v" v="${n}"></span><span class="yv-vlbl">${n}</span>${text}`

describe("parseYouVersionChapter", () => {
  it("reads a chapter into verses, without the printed numbers", () => {
    const html = `<div><div class="p">${verse(1, " In the beginning.")}</div><div class="p">${verse(2, "The earth was formless.")}</div></div>`
    expect(parseYouVersionChapter(html)).toEqual([
      [1, "In the beginning."],
      [2, "The earth was formless."],
    ])
  })

  it("joins the lines of a poem and keeps verses split across paragraphs", () => {
    const html = `<div><div class="q1">${verse(2, " Many say of me,")}</div><div class="q2">“God will not deliver him.”</div><div class="qr">Selah</div><div class="q1">${verse(3, " But You, O LORD.")}</div></div>`
    expect(parseYouVersionChapter(html)).toEqual([
      [2, "Many say of me, “God will not deliver him.” Selah"],
      [3, "But You, O LORD."],
    ])
  })

  it("takes the title of a psalm that is a verse of its own", () => {
    const html = `<div><div class="d">${verse(1, " A Psalm of David.")}</div><div class="q1">O LORD, how my foes have increased!</div><div class="q1">${verse(2, " Many say of me,")}</div></div>`
    expect(parseYouVersionChapter(html)).toEqual([
      [1, "A Psalm of David. O LORD, how my foes have increased!"],
      [2, "Many say of me,"],
    ])
  })

  it("drops the markup inside a verse and decodes entities", () => {
    const html = `<div><div class="p">${verse(3, ' Jesus replied, <span class="wj">“Truly, I tell you, <span class="add">no</span> one.”</span> J&#39;ai l&amp;apos;air &quot;bon&quot;')}</div></div>`
    expect(parseYouVersionChapter(html)).toEqual([
      [3, `Jesus replied, “Truly, I tell you, no one.” J'ai l&apos;air "bon"`],
    ])
  })

  it("counts a run of verses for its first, and keeps a repeated verse whole", () => {
    const html = `<div>${verse(1, " One.")}<span class="yv-v" v="2-3"></span>Two and three.<span class="yv-v" v="1"></span>One again.</div>`
    expect(parseYouVersionChapter(html)).toEqual([
      [1, "One. One again."],
      [2, "Two and three."],
    ])
  })

  it("ignores what is before the first verse and verses with no text", () => {
    const html = `<div><div class="s1">Heading</div>${verse(1, "")}${verse(2, " Text.")}</div>`
    expect(parseYouVersionChapter(html)).toEqual([[2, "Text."]])
  })

  it("is empty for a chapter without verses", () => {
    expect(parseYouVersionChapter("<div></div>")).toEqual([])
  })
})

describe("remote version configs", () => {
  it("have distinct ids and YouVersion ids", () => {
    const ids = remoteVersionConfigs.map((config) => config.id)
    expect(new Set(ids).size).toBe(ids.length)
    const yvIds = remoteVersionConfigs.map((config) => config.youVersionId)
    expect(new Set(yvIds).size).toBe(yvIds.length)
  })
})
