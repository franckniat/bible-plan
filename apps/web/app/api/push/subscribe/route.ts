import { webPushSubscriptionSchema } from "@workspace/core"
import { prisma } from "@workspace/db"

import { subscribeWebPush } from "@/server/services/push-devices"
import { getSession } from "@/server/session"

export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "no-store" }

/**
 * Registers the browser of the signed-in user for push notifications, with
 * the subscription the browser gave (`PushSubscription.toJSON()`).
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore }
    )
  }
  // Only a script of the app sends JSON; a form of another site cannot.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json(
      { error: "invalid" },
      { status: 415, headers: noStore }
    )
  }

  const parsed = webPushSubscriptionSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return Response.json(
      { error: "invalid" },
      { status: 400, headers: noStore }
    )
  }

  await subscribeWebPush(
    prisma,
    session.user.id,
    parsed.data,
    request.headers.get("user-agent")
  )
  return Response.json({ ok: true }, { headers: noStore })
}
