import { prisma } from "@workspace/db"

import { countUnread } from "@/server/services/notifications"
import { getSession } from "@/server/session"

// Always read live: the bell asks again every minute and when the tab is back.
export const dynamic = "force-dynamic"

/** The number of unread notifications of the signed-in user. */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }
  const count = await countUnread(prisma, session.user.id)
  return Response.json({ count }, { headers: { "Cache-Control": "no-store" } })
}
