import "server-only"

import { legalVersion } from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

export type AccountDb = Pick<
  PrismaClient,
  | "user"
  | "account"
  | "readingPlan"
  | "planEnrollment"
  | "reminder"
  | "notification"
  | "highlight"
  | "pushDevice"
  | "prayerRequest"
  | "meditationSession"
  | "meditationNote"
  | "activityDay"
  | "groupMember"
  | "group"
  | "readingComment"
  | "prayerSupport"
  | "achievement"
  | "waitlistEntry"
>

/** Records that the person accepted the current privacy policy and terms. */
export async function acceptTerms(
  db: Pick<PrismaClient, "user">,
  userId: string,
  now = new Date()
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { termsAcceptedAt: now, termsVersion: legalVersion },
  })
}

/** Whether the person has to (re)accept the current policy and terms. */
export function needsConsent(user: { termsVersion?: string | null }): boolean {
  return user.termsVersion !== legalVersion
}

/**
 * Everything the application keeps about a person, as plain data: the right
 * of access and portability. Secrets (password hash, tokens, push keys) are
 * left out: they are not the person's content and would only put the account
 * at risk if the file leaked.
 */
export async function exportUserData(db: AccountDb, userId: string) {
  const [
    user,
    signInMethods,
    plans,
    enrollments,
    reminders,
    notifications,
    highlights,
    pushDevices,
    prayerRequests,
    meditationSessions,
    meditationNotes,
    activityDays,
    groups,
    comments,
    prayerSupports,
    achievements,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        locale: true,
        timezone: true,
        readingWpm: true,
        bibleVersion: true,
        termsAcceptedAt: true,
        termsVersion: true,
      },
    }),
    db.account.findMany({
      where: { userId },
      select: { providerId: true, createdAt: true },
    }),
    db.readingPlan.findMany({
      where: { ownerId: userId },
      include: { days: { include: { readings: true } } },
    }),
    db.planEnrollment.findMany({
      where: { userId },
      include: { progress: true },
    }),
    db.reminder.findMany({ where: { userId } }),
    db.notification.findMany({ where: { userId } }),
    db.highlight.findMany({ where: { userId } }),
    db.pushDevice.findMany({
      where: { userId },
      select: {
        kind: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
    db.prayerRequest.findMany({
      where: { userId },
      include: { logs: true },
    }),
    db.meditationSession.findMany({ where: { userId } }),
    db.meditationNote.findMany({ where: { userId } }),
    db.activityDay.findMany({ where: { userId } }),
    db.groupMember.findMany({
      where: { userId },
      include: { group: { select: { name: true, description: true } } },
    }),
    db.readingComment.findMany({ where: { userId } }),
    db.prayerSupport.findMany({ where: { userId } }),
    db.achievement.findMany({
      where: { userId },
      select: { key: true, level: true, unlockedAt: true },
    }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    signInMethods,
    readingPlans: plans,
    planEnrollments: enrollments,
    reminders,
    notifications,
    highlights,
    pushDevices,
    prayerRequests,
    meditationSessions,
    meditationNotes,
    activityDays,
    groups,
    comments,
    prayerSupports,
    achievements,
  }
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "ownsGroup" | "notFound" }

/**
 * Deletes the account and everything attached to it. The relations cascade
 * (sessions, plans, journal, notes, reminders, comments, memberships…); what
 * does not follow on its own is handled here:
 * - a group the person owns with other members must be handed over first;
 *   alone in it, the group goes with them;
 * - the group plans they created stay for the group (given to its owner);
 * - their waitlist entry, matched by e-mail address, is removed too.
 */
export async function deleteAccount(
  db: AccountDb,
  userId: string
): Promise<DeleteAccountResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) return { ok: false, error: "notFound" }

  const owned = await db.groupMember.findMany({
    where: { userId, role: "OWNER" },
    select: { groupId: true },
  })
  const ownedIds = owned.map((member) => member.groupId)
  const withOthers = await db.groupMember.count({
    where: { groupId: { in: ownedIds }, userId: { not: userId } },
  })
  if (withOthers > 0) return { ok: false, error: "ownsGroup" }

  // Alone in them, the owned groups (and their plans) are deleted.
  await db.group.deleteMany({ where: { id: { in: ownedIds } } })

  // Group plans made by an administrator stay for the group.
  const groupPlans = await db.readingPlan.findMany({
    where: { ownerId: userId, groupId: { not: null } },
    select: { id: true, groupId: true },
  })
  for (const plan of groupPlans) {
    const owner = await db.groupMember.findFirst({
      where: { groupId: plan.groupId!, role: "OWNER" },
      select: { userId: true },
    })
    if (owner) {
      await db.readingPlan.update({
        where: { id: plan.id },
        data: { ownerId: owner.userId },
      })
    }
  }

  await db.waitlistEntry.deleteMany({
    where: { email: user.email.trim().toLowerCase() },
  })
  await db.user.delete({ where: { id: userId } })
  return { ok: true }
}
