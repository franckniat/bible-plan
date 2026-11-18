import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@workspace/db"

import { apiUser, json, readJson, refuse } from "@/server/api-v1"
import { joinGroup } from "@/server/services/groups"

export const dynamic = "force-dynamic"

const joinRequestSchema = z.object({ code: z.string().max(64) })

/**
 * Joins a group with its code, typed or taken from a link (@workspace/core,
 * joinedSchema): being in it already is not an error.
 */
export async function POST(request: Request) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const read = await readJson(request)
  if (read instanceof Response) return read
  const parsed = joinRequestSchema.safeParse(read.body)
  if (!parsed.success) return refuse("invalid")
  const result = await joinGroup(prisma, user.id, parsed.data.code)
  if (!result.ok) return refuse(result.error)
  revalidatePath("/[locale]/groups", "layout")
  return json({ groupId: result.groupId, already: result.already })
}
