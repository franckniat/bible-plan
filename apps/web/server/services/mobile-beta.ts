import "server-only"

/** Where the Android betas are published (Beta APK workflow). */
const repository = "franckniat/bible-plan"

export type MobileBeta = {
  /** "0.0.1 beta 3". */
  version: string
  /** The APK itself, to download at once. */
  apkUrl: string
  /** Its release page: what is new, the install steps. */
  releaseUrl: string
  publishedAt: string
}

type Release = {
  tag_name: string
  html_url: string
  draft: boolean
  published_at: string | null
  assets: { name: string; browser_download_url: string }[]
}

/** The newest Android beta among GitHub releases (tags "mobile-v…"). */
export function latestMobileBeta(
  releases: readonly Release[]
): MobileBeta | null {
  for (const release of releases) {
    const match = /^mobile-v(.+)-beta\.(\d+)$/.exec(release.tag_name)
    const apk = release.assets.find((asset) => asset.name.endsWith(".apk"))
    if (release.draft || !match || !apk || !release.published_at) continue
    return {
      version: `${match[1]} beta ${match[2]}`,
      apkUrl: apk.browser_download_url,
      releaseUrl: release.html_url,
      publishedAt: release.published_at,
    }
  }
  return null
}

/**
 * The newest Android beta, read from GitHub at most every `maxAge` seconds
 * (an hour for the page); null when there is none yet or GitHub cannot be
 * reached (the page shows "soon").
 */
export async function getMobileBeta(maxAge = 3600): Promise<MobileBeta | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/releases?per_page=20`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: maxAge },
      }
    )
    if (!response.ok) return null
    return latestMobileBeta((await response.json()) as Release[])
  } catch {
    return null
  }
}

/**
 * The site's own link to the newest APK (app/api/download/android): it
 * finds the beta when followed, so it still works once an older beta is
 * deleted, and can be shared as it is.
 */
export const betaDownloadPath = "/api/download/android"

/** Every release, where the download falls back without a beta. */
export const releasesUrl = `https://github.com/${repository}/releases`

/** How a tester installs a beta (in French, for the testers). */
export const betaGuideUrl = `https://github.com/${repository}/blob/main/apps/mobile/BETA.md`
