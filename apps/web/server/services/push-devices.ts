import "server-only"

import type { WebPushSubscription } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"
import type { PushPayload, PushSender } from "@workspace/notifications"

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

export type PushOutcome = {
  /** Devices that accepted the message. */
  sent: number
  /** Devices the push service said are gone: forgotten. */
  removed: number
  /** Devices where it failed for another reason (kept for next time). */
  failed: number
}

/**
 * Pushes a message to every browser of a user. A device the push service says
 * is gone (404 or 410) is deleted, one that accepts it is marked as used.
 */
export async function pushToUser(
  db: PushDevicesDb,
  sender: PushSender,
  userId: string,
  payload: PushPayload,
  now = new Date()
): Promise<PushOutcome> {
  const devices = (
    await db.pushDevice.findMany({
      where: { userId, kind: "WEB_PUSH" },
      select: { token: true, p256dh: true, auth: true },
    })
  ).filter(
    (device): device is { token: string; p256dh: string; auth: string } =>
      device.p256dh !== null && device.auth !== null
  )

  const results = await Promise.all(
    devices.map(async (device) => ({
      token: device.token,
      result: await sender.send(
        {
          endpoint: device.token,
          keys: { p256dh: device.p256dh, auth: device.auth },
        },
        payload
      ),
    }))
  )

  const sentTokens = results
    .filter(({ result }) => result.status === "sent")
    .map(({ token }) => token)
  const goneTokens = results
    .filter(({ result }) => result.status === "gone")
    .map(({ token }) => token)

  if (sentTokens.length > 0) {
    await db.pushDevice.updateMany({
      where: { token: { in: sentTokens } },
      data: { lastUsedAt: now },
    })
  }
  const removed = await removePushDevices(db, goneTokens)

  return {
    sent: sentTokens.length,
    removed,
    failed: results.length - sentTokens.length - goneTokens.length,
  }
}
