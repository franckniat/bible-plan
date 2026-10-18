"use server"

import { z } from "zod"

import {
  highlightColorSchema,
  highlightRequestSchema,
  isBookId,
  getChapterCount,
  getVerseCount,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import {
  importHighlights,
  maxImportedHighlights,
  setHighlights,
} from "@/server/services/highlights"
import { requireUser } from "@/server/session"

/** Colors verses of the signed-in user, or removes their color. */
export async function setHighlightsAction(
  request: unknown
): Promise<{ ok: boolean }> {
  const user = await requireUser()
  const parsed = highlightRequestSchema.safeParse(request)
  if (!parsed.success) return { ok: false }
  try {
    await setHighlights(prisma, user.id, parsed.data)
  } catch (error) {
    console.error("Setting highlights failed", error)
    return { ok: false }
  }
  return { ok: true }
}

const deviceHighlightSchema = z.object({
  book: z.string().refine(isBookId),
  chapter: z.int().min(1),
  verse: z.int().min(1),
  color: highlightColorSchema,
})

/**
 * Takes the highlights a visitor made on this device into the account, once
 * they are signed in. What does not exist in the canon is dropped, and a
 * verse the account has already colored is left alone.
 */
export async function importHighlightsAction(
  entries: unknown
): Promise<{ added: number }> {
  const user = await requireUser()
  if (!Array.isArray(entries)) return { added: 0 }

  const valid = entries.slice(0, maxImportedHighlights).flatMap((entry) => {
    const parsed = deviceHighlightSchema.safeParse(entry)
    if (!parsed.success) return []
    const { book, chapter, verse } = parsed.data
    const exists =
      isBookId(book) &&
      chapter <= getChapterCount(book) &&
      verse <= getVerseCount(book, chapter)
    return exists ? [parsed.data] : []
  })
  if (valid.length === 0) return { added: 0 }

  try {
    return { added: await importHighlights(prisma, user.id, valid) }
  } catch (error) {
    console.error("Importing highlights failed", error)
    return { added: 0 }
  }
}
