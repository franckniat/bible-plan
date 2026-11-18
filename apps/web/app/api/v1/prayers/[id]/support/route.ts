import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@workspace/db"

import { apiUser, json, readJson, refuse } from "@/server/api-v1"
import { togglePraying } from "@/server/services/group-prayers"

export const dynamic = "force-dynamic"

/**
 * "I am praying for you" on a request shared with one of the person's
 * groups, given or taken back (@workspace/core, prayingSchema).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const read = await readJson(request)
  if (read instanceof Response) return read
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return refuse("notFound")
  const result = await togglePraying(prisma, user.id, id)
  if (!result.ok) return refuse(result.error)
  revalidatePath("/[locale]/groups", "layout")
  return json({ praying: result.praying, supportCount: result.supportCount })
}
