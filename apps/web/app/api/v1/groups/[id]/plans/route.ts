import { prisma } from "@workspace/db"

import { apiUser, json, refuse } from "@/server/api-v1"
import { listGroupPlans } from "@/server/services/group-plans"

export const dynamic = "force-dynamic"

/**
 * The plans of a group with how far each member is, for one of its members
 * (@workspace/core, groupPlanListSchema); "notFound" for anybody else.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const { id } = await params
  const plans = await listGroupPlans(prisma, user.id, id).catch(() => null)
  return plans ? json({ plans }) : refuse("notFound")
}
