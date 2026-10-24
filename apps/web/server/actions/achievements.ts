"use server"

import { prisma } from "@workspace/db"

import { requireUser } from "@/server/session"

/** The person has seen the celebration of what they earned. */
export async function markAchievementsSeenAction(): Promise<void> {
  const user = await requireUser()
  await prisma.achievement.updateMany({
    where: { userId: user.id, seenAt: null },
    data: { seenAt: new Date() },
  })
}
