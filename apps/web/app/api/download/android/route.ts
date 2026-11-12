import { getMobileBeta, releasesUrl } from "@/server/services/mobile-beta"

export const dynamic = "force-dynamic"

/**
 * Sends to the APK of the newest Android beta (GitHub releases, read at most
 * once a minute), or to the list of releases when none can be found: a link
 * that keeps working from one beta to the next.
 */
export async function GET() {
  const beta = await getMobileBeta(60)
  return new Response(null, {
    status: 302,
    headers: {
      Location: beta?.apkUrl ?? releasesUrl,
      "Cache-Control": "no-store",
    },
  })
}
