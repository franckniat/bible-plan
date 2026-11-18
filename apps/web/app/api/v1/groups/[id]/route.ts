import { prisma } from "@workspace/db"

import { apiUser, json, refuse } from "@/server/api-v1"
import { getGroup } from "@/server/services/groups"

export const dynamic = "force-dynamic"

/**
 * A group and its members, for one of its members (@workspace/core,
 * groupDetailSchema); "notFound" for anybody else.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const { id } = await params
  const group = await getGroup(prisma, user.id, id).catch(() => null)
  return group ? json(group) : refuse("notFound")
}
