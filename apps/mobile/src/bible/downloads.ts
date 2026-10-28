import type { BibleVersionId } from "@workspace/bible-data"
import { useSyncExternalStore } from "react"

import { getPreferences, setPreferences } from "@/lib/preferences"
import { siteUrl } from "@/lib/site"

import { unchooseVersion } from "@/repositories/profile"

import { checkVersion, forgetVersion } from "./texts"
import { deleteVersionFile, downloadVersionFile } from "./version-files"

/** The versions being downloaded now. */
let downloading: readonly BibleVersionId[] = []
const listeners = new Set<() => void>()

function setDownloading(next: readonly BibleVersionId[]) {
  downloading = next
  for (const listener of listeners) listener()
}

export function useDownloading(): readonly BibleVersionId[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => downloading,
    () => downloading
  )
}

/**
 * Downloads a version from the website (about 4 MB), then reads it once:
 * it only joins the readable versions when the whole text is there.
 */
export async function downloadVersion(version: BibleVersionId) {
  if (downloading.includes(version)) return
  setDownloading([...downloading, version])
  try {
    await downloadVersionFile(version, `${siteUrl}/bible/${version}.json`)
    await checkVersion(version)
    const { downloaded } = getPreferences()
    if (!downloaded.includes(version)) {
      setPreferences({ downloaded: [...downloaded, version] })
    }
  } finally {
    setDownloading(downloading.filter((id) => id !== version))
  }
}

/**
 * Removes a downloaded version from the phone (it can be downloaded again).
 * When it was the one read, the reader goes back to the version of the
 * app's language.
 */
export async function removeVersion(version: BibleVersionId) {
  const { downloaded } = getPreferences()
  setPreferences({ downloaded: downloaded.filter((id) => id !== version) })
  forgetVersion(version)
  unchooseVersion(version)
  await deleteVersionFile(version)
}
