import { describe, expect, it } from "vitest"

import { locales } from "@workspace/core"

import { loadMessages } from "./index"

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>(
    (entries, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      return typeof value === "string"
        ? { ...entries, [path]: value }
        : { ...entries, ...flatten(value, path) }
    },
    {}
  )
}

/**
 * ICU arguments (`{name}`, `{name, plural, ...}`) and rich-text tags
 * (`<tag>`) used by a message. Text inside a plural branch such as
 * `{One reading}` is not an argument.
 */
function placeholders(message: string): string[] {
  const args = [...message.matchAll(/\{(\w+)\s*[},]/g)].map(
    (match) => `{${match[1]}}`
  )
  const tags = [...message.matchAll(/<(\w+)>/g)].map((match) => `<${match[1]}>`)
  return [...new Set([...args, ...tags])].sort()
}

describe("messages", async () => {
  const [reference, ...others] = await Promise.all(
    locales.map(async (locale) => ({
      locale,
      messages: flatten(await loadMessages(locale)),
    }))
  )

  it.each(others)("$locale has the same keys as fr", ({ messages }) => {
    expect(Object.keys(messages).sort()).toEqual(
      Object.keys(reference!.messages).sort()
    )
  })

  it.each(others)(
    "$locale uses the same placeholders as fr",
    ({ messages }) => {
      for (const [key, message] of Object.entries(reference!.messages)) {
        expect(placeholders(messages[key] ?? ""), key).toEqual(
          placeholders(message)
        )
      }
    }
  )

  it.each([reference!, ...others])(
    "$locale has no empty message",
    ({ messages }) => {
      for (const [key, message] of Object.entries(messages)) {
        expect(message.trim(), key).not.toBe("")
      }
    }
  )

  // French puts a space before ; : ! ? % and inside « »: it must be a
  // no-break space, or the sign can start a new line.
  it("fr uses no-break spaces around punctuation", () => {
    for (const [key, message] of Object.entries(reference!.messages)) {
      expect(message, key).not.toMatch(/ [;:!?%»]|« /)
    }
  })
})
