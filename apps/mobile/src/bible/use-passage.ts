import {
  loadPassage,
  type BibleVersionId,
  type PassageText,
} from "@workspace/bible-data"
import type { Passage } from "@workspace/core"
import { useEffect, useState } from "react"

import { readChapter } from "./texts"

export type PassageState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; text: PassageText }

/**
 * The text of a passage in a version on the phone, offline. Verse numbers follow
 * the version (bible-data maps them from the canon).
 */
export function usePassage(
  passage: Passage | null,
  version: BibleVersionId
): PassageState {
  // The result is kept with what it is for: any other passage is loading.
  const [loaded, setLoaded] = useState<{
    key: string
    state: PassageState
  } | null>(null)
  const key = passage ? `${version}:${JSON.stringify(passage)}` : null
  useEffect(() => {
    if (!passage || !key) return
    let current = true
    loadPassage(passage, version, async (v, book, chapter) => ({
      version: v,
      book,
      chapter,
      verses: await readChapter(version, book, chapter),
    }))
      .then(
        (text) =>
          current && setLoaded({ key, state: { status: "ready", text } })
      )
      .catch(() => current && setLoaded({ key, state: { status: "error" } }))
    return () => {
      current = false
    }
    // The passage is compared by value, through the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return loaded && loaded.key === key ? loaded.state : { status: "loading" }
}
