import { prisma } from "@workspace/db"

import { exportUserData } from "@/server/services/account"
import { getSession } from "@/server/session"

export const dynamic = "force-dynamic"

/** Downloads everything the application keeps about the signed-in person. */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const data = await exportUserData(prisma, session.user.id)
  const day = new Date().toISOString().slice(0, 10)
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bible-plan-${day}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
