import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@workspace/db"

import { apiUser, json, refuse } from "@/server/api-v1"
import { deleteComment } from "@/server/services/comments"

export const dynamic = "force-dynamic"

/** Deletes a comment, with its answers: its author, or whoever manages the group. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiUser()
  if (user instanceof Response) return user
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return refuse("notFound")
  const result = await deleteComment(prisma, user.id, id)
  if (!result.ok) return refuse(result.error)
  revalidatePath("/[locale]/plans/[id]/days/[day]", "page")
  return json({ ok: true })
}
