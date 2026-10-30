import {
  meditationSessionInputSchema,
  type MeditationSessionInput,
} from "@workspace/core"
import type { SyncRecord } from "@workspace/sync"
import type { z } from "zod"

import { getDatabase } from "@/db/client"
import { meditationSessions } from "@/db/schema"
import type { Database } from "@/db/types"
import { newId } from "@/lib/ids"

import { writeSynced } from "./write"

/**
 * Stores a finished meditation or prayer session (the time really spent),
 * for the statistics. Gives its id, for a note written after it.
 */
export function saveSession(
  db: Database,
  input: z.input<typeof meditationSessionInputSchema>,
  { now = new Date(), id = newId }: { now?: Date; id?: () => string } = {}
): string {
  const session: MeditationSessionInput =
    meditationSessionInputSchema.parse(input)
  const record: SyncRecord<"meditationSession"> = {
    ...session,
    id: id(),
    updatedAt: now.toISOString(),
  }
  writeSynced(
    db,
    { table: "meditationSession", op: "upsert", record },
    (tx) => tx.insert(meditationSessions).values(record).run(),
    now
  )
  return record.id
}

/** Stores a finished session (for screens). */
export function recordSession(
  input: z.input<typeof meditationSessionInputSchema>
): string {
  return saveSession(getDatabase(), input)
}
