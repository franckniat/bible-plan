import webpush from "web-push"

import {
  createWebPushSender,
  getVapidConfig,
  type PushEnv,
  type PushSender,
} from "./sender"

/**
 * The push sender of the app (Web Push through the `web-push` library), or
 * null while the VAPID keys are not set: reminders then skip the push channel.
 */
export function createPushSender(
  env: PushEnv = process.env
): PushSender | null {
  const vapid = getVapidConfig(env)
  if (!vapid) return null
  return createWebPushSender(vapid, (subscription, payload, options) =>
    webpush.sendNotification(subscription, payload, options)
  )
}
