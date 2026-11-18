import { maxMembersPerGroup } from "@workspace/core"
import { prisma } from "@workspace/db"

import { apiUser, json, refuse } from "@/server/api-v1"
import { previewInvite, roleOf } from "@/server/services/groups"

export const dynamic = "force-dynamic"

/**
 * What the signed-in person sees of a group before joining it with its code
 * (@workspace/core, invitePreviewSchema), as on the website's join page;
 * "notFound" when the code leads nowhere.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const { code } = await params
  const group = await previewInvite(prisma, decodeURIComponent(code))
  if (!group) return refuse("notFound")
  return json({
    ...group,
    member: (await roleOf(prisma, user.id, group.id)) !== null,
    full: group.memberCount >= maxMembersPerGroup,
  })
}
