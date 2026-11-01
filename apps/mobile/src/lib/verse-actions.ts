import type { HighlightColor } from "@workspace/core"
import { useSyncExternalStore } from "react"

/**
 * What can be done with the verses selected in the reader, shown by the
 * options' native sheet (app/(bible)/verse-actions): the reader sets it while
 * verses are selected, and clears it when there are none.
 */
export type VerseActions = {
  /** The selection, to tell one from another ("John.3:16,17"). */
  key: string
  /** "Jean 3:16-17". */
  reference: string
  /** The version's abbreviation, "LSG". */
  version: string
  /** The color shared by the verses selected, if they have one. */
  color: HighlightColor | null
  highlight: (color: HighlightColor | null) => void
  /** « … » then the reference and the version, as on the web. */
  copyText: string
  share: () => void
  compare: () => void
  /** Unselects the verses (the sheet was closed). */
  close: () => void
}

type State = {
  actions: VerseActions | null
  /** The height of the sheet once open, for the reader to keep a verse above. */
  sheetHeight: number | null
}

let state: State = { actions: null, sheetHeight: null }
const listeners = new Set<() => void>()

function update(change: Partial<State>) {
  state = { ...state, ...change }
  for (const listener of listeners) listener()
}

export const verseActions = {
  get: () => state,
  set: (actions: VerseActions | null) => update({ actions }),
  setSheetHeight: (sheetHeight: number | null) => update({ sheetHeight }),
}

export function useVerseActions(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state
  )
}
