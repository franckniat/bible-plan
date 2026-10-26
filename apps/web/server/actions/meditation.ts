"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"

import {
  meditationNoteInputSchema,
  meditationSessionInputSchema,
} from "@workspace/core"
import { prisma } from "@workspace/db"

import { syncAchievementsQuietly } from "@/server/services/achievements"
import { refreshActivity } from "@/server/services/activity"
import {
  createNote,
  deleteNote,
  ownsSession,
  saveMeditationSession,
  updateNote,
  type NoteError,
} from "@/server/services/meditation"
import { requireUser } from "@/server/session"

/** Translated by the notes page ("Notes.errors.<code>"). */
export type NoteActionError = NoteError | "invalid" | "limit" | "unexpected"

const idSchema = z.uuid()

/**
 * Saves a finished meditation session of the signed-in user, with the time
 * really spent, and counts it in the day of the user. Gives the id of the
 * session, for a note written right after.
 */
export async function saveMeditationSessionAction(
  request: unknown
): Promise<{ ok: true; sessionId: string } | { ok: false }> {
  const user = await requireUser()
  const parsed = meditationSessionInputSchema.safeParse(request)
  if (!parsed.success) return { ok: false }
  try {
    const sessionId = await saveMeditationSession(prisma, user.id, parsed.data)
    // A time of prayer counts as a prayer and as time prayed; a meditation as
    // time meditated.
    await refreshActivity(prisma, user.id, user.timezone).catch((error) =>
      console.error("Recording activity failed", error)
    )
    after(() => syncAchievementsQuietly(prisma, user))
    revalidatePath("/[locale]", "layout")
    return { ok: true, sessionId }
  } catch (error) {
    console.error("Saving a meditation session failed", error)
    return { ok: false }
  }
}

/** Creates a note (no id) or changes one of the signed-in user. */
export async function saveNoteAction(
  id: string | null,
  request: unknown
): Promise<{ ok: true; id: string } | { error: NoteActionError }> {
  const user = await requireUser()
  const parsed = meditationNoteInputSchema.safeParse(request)
  if (!parsed.success || (id !== null && !idSchema.safeParse(id).success)) {
    return { error: "invalid" }
  }
  try {
    let input = parsed.data
    // A session that is not the user's is dropped, not trusted.
    if (
      input.sessionId &&
      !(await ownsSession(prisma, user.id, input.sessionId))
    ) {
      input = { ...input, sessionId: null }
    }
    if (id === null) {
      const result = await createNote(prisma, user.id, input)
      if (!result.ok) return { error: result.error }
      after(() => syncAchievementsQuietly(prisma, user))
      revalidatePath("/[locale]/notes", "page")
      return { ok: true, id: result.id }
    }
    const result = await updateNote(prisma, user.id, id, input)
    if (!result.ok) return { error: result.error }
    revalidatePath("/[locale]/notes", "page")
    return { ok: true, id }
  } catch (error) {
    console.error("Saving a note failed", error)
    return { error: "unexpected" }
  }
}

export async function deleteNoteAction(
  id: string
): Promise<{ ok: true } | { error: NoteActionError }> {
  const user = await requireUser()
  if (!idSchema.safeParse(id).success) return { error: "invalid" }
  try {
    const result = await deleteNote(prisma, user.id, id)
    if (!result.ok) return { error: result.error }
  } catch (error) {
    console.error("Deleting a note failed", error)
    return { error: "unexpected" }
  }
  revalidatePath("/[locale]/notes", "page")
  return { ok: true }
}
