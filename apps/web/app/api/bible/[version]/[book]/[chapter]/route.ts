import {
  getBibleVersion,
  isBibleVersionId,
  parseYouVersionChapter,
  usfmCode,
} from "@workspace/bible-data"
import { getChapterCount, isBookId } from "@workspace/core"

// The YouVersion API is asked for a chapter at most once a day (the answer is
// kept by Next.js, and by browsers and the CDN for as long as YouVersion says
// its answers may be kept).
const oneDay = 60 * 60 * 24

type Params = { version: string; book: string; chapter: string }

function json(body: unknown, status: number, headers: HeadersInit = {}) {
  return Response.json(body, { status, headers })
}

/**
 * One chapter of a translation served by the YouVersion Platform API, in the
 * same shape as the stored chapter files. The API key stays on the server.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { version: versionId, book, chapter: chapterText } = await params

  const key = process.env.YOUVERSION_API_KEY
  if (!key) return json({ error: "not_configured" }, 503)

  if (!isBibleVersionId(versionId)) return json({ error: "not_found" }, 404)
  const version = getBibleVersion(versionId)
  if (version.kind !== "youversion") return json({ error: "not_found" }, 404)

  const chapter = Number(chapterText)
  if (
    !isBookId(book) ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > getChapterCount(book)
  ) {
    return json({ error: "not_found" }, 404)
  }

  // A translation under copyright is only given to the pages of this site,
  // not to a script that would walk through the whole Bible.
  const site = request.headers.get("sec-fetch-site")
  if (!version.publicDomain && site !== "same-origin" && site !== "same-site") {
    return json({ error: "forbidden" }, 403)
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `https://api.youversion.com/v1/bibles/${version.youVersion.id}/passages/${usfmCode(book)}.${chapter}?format=html`,
      {
        headers: { "X-YVP-App-Key": key, Accept: "application/json" },
        next: { revalidate: oneDay },
      }
    )
  } catch {
    return json({ error: "unavailable" }, 502)
  }

  if (upstream.status === 404) return json({ error: "not_found" }, 404)
  if (upstream.status === 429) {
    return json({ error: "rate_limited" }, 429, { "Retry-After": "60" })
  }
  // 403: the licence of this translation is not accepted for the key.
  if (!upstream.ok) return json({ error: "unavailable" }, 502)

  const { content } = (await upstream.json().catch(() => ({}))) as {
    content?: unknown
  }
  const verses =
    typeof content === "string" ? parseYouVersionChapter(content) : []
  if (verses.length === 0) return json({ error: "unavailable" }, 502)

  return json({ version: versionId, book, chapter, verses }, 200, {
    "Cache-Control": `public, max-age=${oneDay}`,
  })
}
