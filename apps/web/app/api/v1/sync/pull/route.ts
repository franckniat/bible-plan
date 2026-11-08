import { prisma } from "@workspace/db"
import { pullRequestSchema } from "@workspace/sync"

import { pullChanges } from "@/server/services/sync-pull"
import { getSession } from "@/server/session"

export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "no-store" }

/**
 * What changed on the server for the person since `?cursor=` (a
 * syncVersion, "0" the first time), a page of at most `?limit=` changes
 * and deletions (@workspace/sync, PullResponse). The phone pulls again at
 * once while `more` is true.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore }
    )
  }
  const params = new URL(request.url).searchParams
  const parsed = pullRequestSchema.safeParse({
    cursor: params.get("cursor") ?? undefined,
    limit: params.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return Response.json(
      { error: "invalid" },
      { status: 400, headers: noStore }
    )
  }
  const { cursor, limit } = parsed.data
  return Response.json(
    await pullChanges(prisma, session.user.id, BigInt(cursor), limit),
    { headers: noStore }
  )
}
