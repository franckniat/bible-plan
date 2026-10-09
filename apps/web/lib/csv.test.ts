import { describe, expect, it } from "vitest"

import { toCsv } from "./csv"

describe("toCsv", () => {
  it("writes a header and rows separated by CRLF", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          ["1", 2],
          [null, undefined],
        ]
      )
    ).toBe("a,b\r\n1,2\r\n,")
  })

  it("quotes cells containing separators, quotes or line breaks", () => {
    expect(toCsv(["x"], [['Marie "Mimi", Doe'], ["line\nbreak"]])).toBe(
      'x\r\n"Marie ""Mimi"", Doe"\r\n"line\nbreak"'
    )
  })

  it("neutralizes spreadsheet formulas", () => {
    expect(toCsv(["x"], [["=HYPERLINK(1)"], ["+33"], ["-1"], ["@cmd"]])).toBe(
      "x\r\n'=HYPERLINK(1)\r\n'+33\r\n'-1\r\n'@cmd"
    )
  })

  it("writes dates in ISO format", () => {
    expect(toCsv(["d"], [[new Date("2026-10-10T08:00:00Z")]])).toBe(
      "d\r\n2026-10-10T08:00:00.000Z"
    )
  })
})
