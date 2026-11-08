import { prisma } from "@workspace/db"
import { pushRequestSchema } from "@workspace/sync"
import { after } from "next/server"

import { refreshActivity } from "@/server/services/activity"
import { syncAchievementsQuietly } from "@/server/services/achievements"
import { activityTables, applyPush } from "@/server/services/sync-push"
import { getSession } from "@/server/session"

export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "no-store" }

/**
 * Takes a batch of the mobile app's outbox (@workspace/sync, PushRequest):
 * each change is written or refused, and the server's own version comes
 * back when it wins. Sending the same batch again changes nothing.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore }
    )
  }
  // Only the app sends JSON; a form of another site cannot.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json(
      { error: "invalid" },
      { status: 415, headers: noStore }
    )
  }
  const parsed = pushRequestSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return Response.json(
      { error: "invalid" },
      { status: 400, headers: noStore }
    )
  }

  const { user } = session
  const { changes } = parsed.data
  const response = await applyPush(prisma, user.id, changes)

  // Readings, prayers and sessions from the phone count in the streaks
  // and the trophies, as on the web.
  const accepted = new Set(response.accepted)
  if (
    changes.some(
      (change) =>
        accepted.has(change.id) && activityTables.includes(change.table)
    )
  ) {
    after(async () => {
      try {
        await refreshActivity(prisma, user.id, user.timezone)
      } catch (error) {
        console.error("Refreshing the activity after a sync failed", error)
      }
      await syncAchievementsQuietly(prisma, user)
    })
  }
  return Response.json(response, { headers: noStore })
}
