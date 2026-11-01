import { describe, expect, it, vi } from "vitest"

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }))

const { bandsOf, piecesOf, slice } = await import("./marked-text")

const parts = [
  { key: "1-n", text: "1", mark: { color: "chip", group: "1-n" } },
  { key: "1-s", text: " " },
  { key: "1-0", text: "Au ", mark: { color: "band", group: "1" } },
  { key: "1-1", text: "commencement", mark: { color: "band", group: "1" } },
  { key: "1-e", text: " " },
  { key: "2-0", text: "Dieu" },
]

const line = (text: string) => ({
  text,
  x: 0,
  y: 0,
  width: 0,
  height: 30,
  ascender: 14,
  descender: 4,
  capHeight: 10,
  xHeight: 7,
})

describe("marked text", () => {
  it("joins the marked parts of a verse into one band, its number apart", () => {
    expect(bandsOf(parts)).toEqual([
      { start: 0, end: 1, color: "chip", kind: "band" },
      { start: 2, end: 17, color: "band", kind: "band" },
    ])
  })

  it("cuts a band at the lines, leaving out the spaces at their ends", () => {
    // "1 Au " on the first line, "commencement Dieu" on the second.
    const lines = [line("1 Au "), line("commencement Dieu")]
    expect(piecesOf(bandsOf(parts), lines)).toEqual([
      { line: 0, from: 0, to: 1, color: "chip", kind: "band" },
      { line: 0, from: 2, to: 4, color: "band", kind: "band" },
      { line: 1, from: 0, to: 12, color: "band", kind: "band" },
    ])
  })

  it("puts dots under the words of a selected verse, not under its number", () => {
    const selected = parts.map((part) =>
      part.key.startsWith("1-") && part.key !== "1-n" && part.key !== "1-s"
        ? { ...part, mark: undefined, underline: { color: "gold", group: "1" } }
        : { ...part, mark: undefined }
    )
    expect(bandsOf(selected)).toEqual([
      // The space after the verse is in, then left out at the end of a line.
      { start: 2, end: 18, color: "gold", kind: "dots" },
    ])
  })

  it("gives the parts of a stretch of text, cut to it", () => {
    expect(slice(parts, 2, 8).map((part) => part.text)).toEqual(["Au ", "com"])
  })
})
