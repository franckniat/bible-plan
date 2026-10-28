import {
  bibleVersions,
  getBibleVersion,
  type BibleVersionId,
} from "@workspace/bible-data"

/** The versions bundled with the app, readable from the first launch. */
export const bundledVersions = [
  "lsg1910",
  "kjv",
] as const satisfies readonly BibleVersionId[]

export type BundledVersion = (typeof bundledVersions)[number]

export function isBundled(version: string): version is BundledVersion {
  return (bundledVersions as readonly string[]).includes(version)
}

/**
 * The other versions stored on the website (public domain), downloaded on
 * demand to keep the app light (PLAN-MOBILE.md, M12).
 */
export const downloadableVersions: readonly BibleVersionId[] = bibleVersions
  .filter((version) => version.kind === "hosted" && !isBundled(version.id))
  .map((version) => version.id)

/** The versions this phone can read: bundled, then downloaded. */
export function readableVersions(
  downloaded: readonly string[]
): BibleVersionId[] {
  return [
    ...bundledVersions,
    ...downloadableVersions.filter((id) => downloaded.includes(id)),
  ]
}

/** A version's proper name, not translated. */
export function versionName(version: BibleVersionId): string {
  return getBibleVersion(version).name
}
