import "server-only"

import type { WebPushSubscription } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type PushDevicesDb = Pick<PrismaClient, "pushDevice">

/** Devices kept per user; the oldest go first, so the list cannot grow forever. */
export const maxPushDevicesPerUser = 10

/**
 * Registers a browser to receive push notifications. The endpoint is the
 * browser's own address, so subscribing again from it only refreshes the
 * keys; if another account was signed in there before, the device moves to
 * the account that subscribes now.
 */
export async function subscribeWebPush(
  db: PushDevicesDb,
  userId: string,
  { endpoint, keys }: WebPushSubscription,
  userAgent?: string | null
): Promise<void> {
  const agent = userAgent?.slice(0, 300) || null
  await db.pushDevice.upsert({
    where: { token: endpoint },
    create: {
      userId,
      kind: "WEB_PUSH",
      token: endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: agent,
    },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: agent,
    },
  })

  // Past the limit, the oldest devices are dropped.
  const devices = await db.pushDevice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: maxPushDevicesPerUser,
  })
  if (devices.length > 0) {
    await db.pushDevice.deleteMany({
      where: { id: { in: devices.map((device) => device.id) } },
    })
  }
}

/** Stops pushing to a browser of the user. False when it was not theirs. */
export async function unsubscribeWebPush(
  db: PushDevicesDb,
  userId: string,
  endpoint: string
): Promise<boolean> {
  const { count } = await db.pushDevice.deleteMany({
    where: { token: endpoint, userId },
  })
  return count > 0
}

/** The devices of a user, for the settings. */
export async function listPushDevices(db: PushDevicesDb, userId: string) {
  return db.pushDevice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, userAgent: true, createdAt: true },
  })
}

/** Forgets devices the push service said are gone (404 or 410). */
export async function removePushDevices(
  db: PushDevicesDb,
  tokens: string[]
): Promise<number> {
  if (tokens.length === 0) return 0
  const { count } = await db.pushDevice.deleteMany({
    where: { token: { in: tokens } },
  })
  return count
}
