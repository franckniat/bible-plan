import { prisma } from "@workspace/db"

import { apiUser, json } from "@/server/api-v1"
import { listGroups } from "@/server/services/groups"

export const dynamic = "force-dynamic"

/** The groups of the signed-in person (@workspace/core, groupListSchema). */
export async function GET() {
  const user = await apiUser()
  if (user instanceof Response) return user
  return json({ groups: await listGroups(prisma, user.id) })
}
