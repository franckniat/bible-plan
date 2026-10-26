import { prisma } from "@workspace/db"

import { isAuthorizedCron } from "@/lib/cron-auth"
import { getReminderEmailSender } from "@/server/reminder-email"
import { getReminderPushSender } from "@/server/reminder-push"
import { getReminderContent } from "@/server/reminder-message"
import {
  defaultBatchSize,
  dispatchDueReminders,
  purgeOldDeliveries,
  type DispatchResult,
} from "@/server/services/reminder-dispatch"
import { purgeOldNotifications } from "@/server/services/notifications"
import { purgeOldTombstones } from "@/server/services/sync-tombstones"

export const dynamic = "force-dynamic"
// A run handles a few batches; what is left waits for the next run.
export const maxDuration = 60

const maxBatches = 10

/**
 * Called every 5 minutes by a scheduled GitHub Actions workflow with the
 * CRON_SECRET: delivers the reminders that are due, then tidies old
 * notifications, deliveries and sync tombstones.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request, process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const total: DispatchResult = {
    due: 0,
    claimed: 0,
    skipped: 0,
    delivered: 0,
    failed: 0,
  }
  const now = new Date()
  for (let batch = 0; batch < maxBatches; batch++) {
    const result = await dispatchDueReminders(prisma, {
      now,
      content: getReminderContent,
      // Undefined (email left alone) until EMAIL_REMINDERS_ENABLED is on.
      sendEmail: getReminderEmailSender(),
      // Undefined (push channel left alone) until the VAPID keys are set.
      sendPush: getReminderPushSender(),
    })
    for (const key of Object.keys(total) as (keyof DispatchResult)[]) {
      total[key] += result[key]
    }
    // A short batch means nothing else is due.
    if (result.due < defaultBatchSize) break
  }

  const purged = await purgeOldNotifications(prisma, now)
  const purgedDeliveries = await purgeOldDeliveries(prisma, now)
  const purgedTombstones = await purgeOldTombstones(prisma, now)
  return Response.json({
    ...total,
    purged,
    purgedDeliveries,
    purgedTombstones,
  })
}
