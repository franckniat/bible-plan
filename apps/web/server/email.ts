import "server-only"

import type { PrismaClient } from "@workspace/db"
import { prisma } from "@workspace/db"
import {
  createEmailSender,
  getEmailDailyLimit,
  isEmailEnabled,
  QuotaGuardedEmailSender,
  type EmailQuotaStore,
  type EmailSender,
} from "@workspace/notifications"

const toDate = (day: string) => new Date(`${day}T00:00:00Z`)

/** Daily email counter stored in the EmailDailyUsage table. */
export function createPrismaEmailQuotaStore(
  db: Pick<PrismaClient, "emailDailyUsage">
): EmailQuotaStore {
  return {
    async countSent(day) {
      const usage = await db.emailDailyUsage.findUnique({
        where: { day: toDate(day) },
      })
      return usage?.sent ?? 0
    },
    async recordSent(day) {
      await db.emailDailyUsage.upsert({
        where: { day: toDate(day) },
        create: { day: toDate(day), sent: 1 },
        update: { sent: { increment: 1 } },
      })
    },
  }
}

let sender: EmailSender | undefined

/**
 * Email sender of the app. With Resend, sends are counted against the daily
 * quota (authentication emails first); in development emails are printed.
 */
export function getEmailSender(): EmailSender {
  sender ??= isEmailEnabled()
    ? new QuotaGuardedEmailSender(
        createEmailSender(),
        createPrismaEmailQuotaStore(prisma),
        getEmailDailyLimit()
      )
    : createEmailSender()
  return sender
}
