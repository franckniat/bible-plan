import { revalidatePath } from "next/cache"
import { z } from "zod"

import { commentInputSchema } from "@workspace/core"
import { prisma } from "@workspace/db"

import { apiUser, json, readJson, refuse } from "@/server/api-v1"
import { addComment, getDayThread } from "@/server/services/comments"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string; day: string }> }

/** The plan and the day of the address, or null when they cannot be. */
async function dayOf(params: Params["params"]) {
  const { id, day } = await params
  const dayNumber = Number(day)
  return z.uuid().safeParse(id).success &&
    Number.isInteger(dayNumber) &&
    dayNumber >= 1
    ? { planId: id, dayNumber }
    : null
}

/**
 * The discussion about a day of a group plan, for the members of the group
 * (@workspace/core, dayThreadSchema); "notFound" for anybody else.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const day = await dayOf(params)
  const thread = day
    ? await getDayThread(prisma, user.id, day.planId, day.dayNumber)
    : null
  return thread ? json(thread) : refuse("notFound")
}

/** Writes a comment, or an answer, on that day (@workspace/core, createdSchema). */
export async function POST(request: Request, { params }: Params) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const read = await readJson(request)
  if (read instanceof Response) return read
  const day = await dayOf(params)
  if (!day) return refuse("notFound")
  const parsed = commentInputSchema.safeParse(read.body)
  if (!parsed.success) return refuse("invalid")
  const result = await addComment(
    prisma,
    user.id,
    day.planId,
    day.dayNumber,
    parsed.data
  )
  if (!result.ok) return refuse(result.error)
  revalidatePath("/[locale]/plans/[id]/days/[day]", "page")
  return json({ id: result.id }, 201)
}
