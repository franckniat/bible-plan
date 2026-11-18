import { prisma } from "@workspace/db"

import { apiUser, json, refuse } from "@/server/api-v1"
import { listGroupPrayers } from "@/server/services/group-prayers"

export const dynamic = "force-dynamic"

/**
 * The prayer requests shared with a group, for its members (@workspace/core,
 * groupPrayerListSchema); "notFound" for anybody else.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const { id } = await params
  const prayers = await listGroupPrayers(prisma, user.id, id).catch(() => null)
  return prayers ? json({ prayers }) : refuse("notFound")
}
