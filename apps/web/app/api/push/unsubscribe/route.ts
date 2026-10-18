import { pushEndpointSchema } from "@workspace/core"
import { prisma } from "@workspace/db"

import { unsubscribeWebPush } from "@/server/services/push-devices"
import { getSession } from "@/server/session"

export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "no-store" }

/** Stops push notifications to a browser of the signed-in user. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore }
    )
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json(
      { error: "invalid" },
      { status: 415, headers: noStore }
    )
  }

  const parsed = pushEndpointSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return Response.json(
      { error: "invalid" },
      { status: 400, headers: noStore }
    )
  }

  // Unknown or someone else's: the same answer, nothing to tell.
  await unsubscribeWebPush(prisma, session.user.id, parsed.data.endpoint)
  return Response.json({ ok: true }, { headers: noStore })
}
