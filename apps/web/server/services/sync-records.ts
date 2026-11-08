import "server-only"

import { maxRemindersPerUser, nextReminderRun } from "@workspace/core"
import type { Prisma } from "@workspace/db"
import {
  reattachProgress,
  recordSchemas,
  type SyncRecord,
  type SyncTable,
} from "@workspace/sync"

/**
 * How each synced table of the phone (@workspace/sync) is read from and
 * written to the database, for the routes of the mobile sync. Records keep
 * the time the phone wrote them (updatedAt), which decides between two
 * writes of the same record.
 */

export type SyncDb = Prisma.TransactionClient

/** A record as stored, with the person it belongs to. */
export type StoredRecord<T extends SyncTable> = {
  ownerId: string
  record: SyncRecord<T>
}

type TableAccess<T extends SyncTable> = {
  /** The model's name, as in the tombstones' "table". */
  model: string
  find(db: SyncDb, id: string): Promise<StoredRecord<T> | null>
  /** The person's record for the same thing (recordKey), whatever its id. */
  findSame(
    db: SyncDb,
    userId: string,
    record: SyncRecord<T>
  ): Promise<SyncRecord<T> | null>
  /** Whether the record may be written: its parents are the person's. */
  allowed(
    db: SyncDb,
    userId: string,
    record: SyncRecord<T>,
    stored: SyncRecord<T> | null
  ): Promise<boolean>
  write(
    db: SyncDb,
    userId: string,
    record: SyncRecord<T>,
    stored: SyncRecord<T> | null,
    now: Date
  ): Promise<void>
  remove(db: SyncDb, id: string): Promise<void>
  /** The person's records changed after a cursor, and their syncVersion. */
  changedSince(
    db: SyncDb,
    userId: string,
    cursor: bigint,
    limit: number
  ): Promise<{ record: SyncRecord<T>; syncVersion: bigint }[]>
}

/** A calendar date as stored in a DATE column (midnight UTC). */
const toDay = (day: string) => new Date(`${day}T00:00:00.000Z`)
const fromDay = (date: Date) => date.toISOString().slice(0, 10)
const toTime = (time: string) => new Date(time)
const fromTime = (date: Date) => date.toISOString()

const parse = <T extends SyncTable>(table: T, value: unknown) =>
  recordSchemas[table].parse(value) as SyncRecord<T>

const planInclude = {
  days: {
    orderBy: { dayNumber: "asc" },
    include: { readings: { orderBy: { position: "asc" } } },
  },
} as const

type PlanRow = Prisma.ReadingPlanGetPayload<{ include: typeof planInclude }>

function planRecord(row: PlanRow): SyncRecord<"readingPlan"> {
  return parse("readingPlan", {
    ...row,
    startDate: fromDay(row.startDate),
    endDate: fromDay(row.endDate),
    updatedAt: fromTime(row.updatedAt),
    days: row.days.map((day) => ({ ...day, date: fromDay(day.date) })),
  })
}

/** Whether the person is a member of the group. */
async function inGroup(db: SyncDb, userId: string, groupId: string) {
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true },
  })
  return member !== null
}

/** Groups are joined in the app (M17): a sync never moves a record to one. */
const sameGroup = (
  record: { groupId: string | null },
  stored: { groupId: string | null } | null
) => record.groupId === null || record.groupId === stored?.groupId

const readingPlan: TableAccess<"readingPlan"> = {
  model: "ReadingPlan",
  async find(db, id) {
    const row = await db.readingPlan.findUnique({
      where: { id },
      include: planInclude,
    })
    return row && { ownerId: row.ownerId, record: planRecord(row) }
  },
  async findSame() {
    return null
  },
  async allowed(_db, _userId, record, stored) {
    return sameGroup(record, stored)
  },
  async write(db, userId, record, stored) {
    const { days, ...plan } = record
    const data = {
      ...plan,
      startDate: toDay(plan.startDate),
      endDate: toDay(plan.endDate),
      tracks: plan.tracks as Prisma.InputJsonValue,
      pace: plan.pace as Prisma.InputJsonValue,
      updatedAt: toTime(plan.updatedAt),
    }
    await db.readingPlan.upsert({
      where: { id: plan.id },
      create: { ...data, ownerId: userId },
      update: data,
    })

    const readings = days.flatMap((day) => day.readings)
    if (stored) {
      // Progress on readings that a catch-up made elsewhere replaced moves
      // to the reading of the same passage (merge.ts).
      const progress = await db.readingProgress.findMany({
        where: { enrollment: { planId: plan.id } },
        select: { id: true, readingId: true, enrollmentId: true },
      })
      const moved = reattachProgress(
        progress,
        stored.days.flatMap((day) => day.readings),
        readings
      )
      const taken = new Set(
        progress.map((row) => `${row.enrollmentId} ${row.readingId}`)
      )
      for (const row of progress) {
        const readingId = moved.get(row.id)
        if (!readingId) continue
        if (taken.has(`${row.enrollmentId} ${readingId}`)) continue
        taken.add(`${row.enrollmentId} ${readingId}`)
        await db.readingProgress.update({
          where: { id: row.id },
          data: { readingId },
        })
      }
    }

    // Days and readings no longer in the plan go (with their progress),
    // then the others are written; days moved to another number pass by a
    // free number first, as the numbers are unique in a plan.
    await db.planDay.deleteMany({
      where: { planId: plan.id, id: { notIn: days.map((day) => day.id) } },
    })
    await db.planReading.deleteMany({
      where: {
        day: { planId: plan.id },
        id: { notIn: readings.map((reading) => reading.id) },
      },
    })
    const storedDays = new Map((stored?.days ?? []).map((day) => [day.id, day]))
    for (const day of days) {
      const before = storedDays.get(day.id)
      if (before && before.dayNumber !== day.dayNumber) {
        await db.planDay.update({
          where: { id: day.id },
          data: { dayNumber: -day.dayNumber },
        })
      }
    }
    for (const { readings: dayReadings, ...day } of days) {
      const data = { ...day, date: toDay(day.date) }
      await db.planDay.upsert({
        where: { id: day.id },
        create: { ...data, planId: plan.id },
        update: data,
      })
      const known = new Set(
        storedDays.get(day.id)?.readings.map((reading) => reading.id)
      )
      await db.planReading.createMany({
        data: dayReadings
          .filter((reading) => !known.has(reading.id))
          .map((reading) => ({ ...reading, dayId: day.id })),
        skipDuplicates: true,
      })
    }
  },
  async remove(db, id) {
    await db.readingPlan.deleteMany({ where: { id } })
  },
  async changedSince(db, userId, cursor, limit) {
    const rows = await db.readingPlan.findMany({
      where: {
        syncVersion: { gt: cursor },
        // The plans of the person, and those of groups they follow.
        OR: [{ ownerId: userId }, { enrollments: { some: { userId } } }],
      },
      include: planInclude,
      orderBy: { syncVersion: "asc" },
      take: limit,
    })
    return rows.map((row) => ({
      record: planRecord(row),
      syncVersion: row.syncVersion,
    }))
  },
}

/** Access to a table whose rows hold their owner in `userId`. */
function ownedTable<T extends SyncTable, Row extends { userId: string }>(
  table: T,
  model: string,
  delegate: (db: SyncDb) => {
    findUnique(args: { where: { id: string } }): Promise<Row | null>
    findMany(args: object): Promise<(Row & { syncVersion: bigint })[]>
    deleteMany(args: { where: { id: string } }): Promise<unknown>
    upsert(args: object): Promise<unknown>
  },
  convert: {
    toRecord(row: Row): unknown
    toData(record: SyncRecord<T>, now: Date): object
    /** Fields set only when the record is created on the server. */
    created?: (now: Date) => object
  },
  rules: Pick<TableAccess<T>, "findSame" | "allowed"> = {
    findSame: async () => null,
    allowed: async () => true,
  }
): TableAccess<T> {
  return {
    model,
    async find(db, id) {
      const row = await delegate(db).findUnique({ where: { id } })
      return (
        row && {
          ownerId: row.userId,
          record: parse(table, convert.toRecord(row)),
        }
      )
    },
    ...rules,
    async write(db, userId, record, _stored, now) {
      const data = convert.toData(record, now)
      await delegate(db).upsert({
        where: { id: record.id },
        create: { ...data, ...convert.created?.(now), id: record.id, userId },
        update: data,
      })
    },
    async remove(db, id) {
      await delegate(db).deleteMany({ where: { id } })
    },
    async changedSince(db, userId, cursor, limit) {
      const rows = await delegate(db).findMany({
        where: { userId, syncVersion: { gt: cursor } },
        orderBy: { syncVersion: "asc" },
        take: limit,
      })
      return rows.map((row) => ({
        record: parse(table, convert.toRecord(row)),
        syncVersion: row.syncVersion,
      }))
    },
  }
}

const withTimes = <R extends { updatedAt: Date }>(row: R) => ({
  ...row,
  updatedAt: fromTime(row.updatedAt),
})

const planEnrollment = ownedTable(
  "planEnrollment",
  "PlanEnrollment",
  (db) => db.planEnrollment,
  {
    toRecord: withTimes,
    toData: ({ planId, status, updatedAt }) => ({
      planId,
      status,
      updatedAt: toTime(updatedAt),
    }),
  },
  {
    async findSame(db, userId, record) {
      const row = await db.planEnrollment.findUnique({
        where: { planId_userId: { planId: record.planId, userId } },
      })
      return row && parse("planEnrollment", withTimes(row))
    },
    async allowed(db, userId, record) {
      const plan = await db.readingPlan.findUnique({
        where: { id: record.planId },
        select: { ownerId: true, groupId: true },
      })
      if (!plan) return false
      return (
        plan.ownerId === userId ||
        (plan.groupId !== null && (await inGroup(db, userId, plan.groupId)))
      )
    },
  }
)

const progressRecord = (row: {
  id: string
  enrollmentId: string
  readingId: string
  completedAt: Date
  updatedAt: Date
}) =>
  parse("readingProgress", {
    ...withTimes(row),
    completedAt: fromTime(row.completedAt),
  })

const readingProgress: TableAccess<"readingProgress"> = {
  model: "ReadingProgress",
  async find(db, id) {
    const row = await db.readingProgress.findUnique({
      where: { id },
      include: { enrollment: { select: { userId: true } } },
    })
    return (
      row && { ownerId: row.enrollment.userId, record: progressRecord(row) }
    )
  },
  async findSame(db, _userId, record) {
    const row = await db.readingProgress.findUnique({
      where: {
        enrollmentId_readingId: {
          enrollmentId: record.enrollmentId,
          readingId: record.readingId,
        },
      },
    })
    return row && progressRecord(row)
  },
  async allowed(db, userId, record) {
    const [enrollment, reading] = await Promise.all([
      db.planEnrollment.findUnique({
        where: { id: record.enrollmentId },
        select: { userId: true, planId: true },
      }),
      db.planReading.findUnique({
        where: { id: record.readingId },
        select: { day: { select: { planId: true } } },
      }),
    ])
    return (
      enrollment?.userId === userId && reading?.day.planId === enrollment.planId
    )
  },
  async write(db, _userId, record) {
    const data = {
      enrollmentId: record.enrollmentId,
      readingId: record.readingId,
      completedAt: toTime(record.completedAt),
      updatedAt: toTime(record.updatedAt),
    }
    await db.readingProgress.upsert({
      where: { id: record.id },
      create: { ...data, id: record.id },
      update: data,
    })
  },
  async remove(db, id) {
    await db.readingProgress.deleteMany({ where: { id } })
  },
  async changedSince(db, userId, cursor, limit) {
    const rows = await db.readingProgress.findMany({
      where: { enrollment: { userId }, syncVersion: { gt: cursor } },
      orderBy: { syncVersion: "asc" },
      take: limit,
    })
    return rows.map((row) => ({
      record: progressRecord(row),
      syncVersion: row.syncVersion,
    }))
  },
}

const prayerRequest = ownedTable(
  "prayerRequest",
  "PrayerRequest",
  (db) => db.prayerRequest,
  {
    toRecord: (row) => ({
      ...withTimes(row),
      startedOn: fromDay(row.startedOn),
      answeredOn: row.answeredOn && fromDay(row.answeredOn),
      lastPrayedAt: row.lastPrayedAt && fromTime(row.lastPrayedAt),
    }),
    toData: (record) => ({
      title: record.title,
      details: record.details,
      category: record.category,
      status: record.status,
      startedOn: toDay(record.startedOn),
      passages: record.passages,
      lastPrayedAt: record.lastPrayedAt && toTime(record.lastPrayedAt),
      prayerCount: record.prayerCount,
      answeredOn: record.answeredOn && toDay(record.answeredOn),
      answerNote: record.answerNote,
      groupId: record.groupId,
      updatedAt: toTime(record.updatedAt),
    }),
  },
  {
    findSame: async () => null,
    allowed: async (_db, _userId, record, stored) => sameGroup(record, stored),
  }
)

const prayerLog = ownedTable(
  "prayerLog",
  "PrayerLog",
  (db) => db.prayerLog,
  {
    toRecord: (row) => ({
      ...withTimes(row),
      prayedAt: fromTime(row.prayedAt),
    }),
    toData: (record) => ({
      requestId: record.requestId,
      prayedAt: toTime(record.prayedAt),
      updatedAt: toTime(record.updatedAt),
    }),
  },
  {
    findSame: async () => null,
    async allowed(db, userId, record) {
      const request = await db.prayerRequest.findUnique({
        where: { id: record.requestId },
        select: { userId: true },
      })
      return request?.userId === userId
    },
  }
)

const meditationSession = ownedTable(
  "meditationSession",
  "MeditationSession",
  (db) => db.meditationSession,
  {
    toRecord: (row) => ({
      ...withTimes(row),
      startedAt: fromTime(row.startedAt),
    }),
    toData: (record) => ({
      kind: record.kind,
      passage: record.passage,
      plannedSeconds: record.plannedSeconds,
      durationSeconds: record.durationSeconds,
      startedAt: toTime(record.startedAt),
      updatedAt: toTime(record.updatedAt),
    }),
  }
)

const meditationNote = ownedTable(
  "meditationNote",
  "MeditationNote",
  (db) => db.meditationNote,
  {
    toRecord: withTimes,
    toData: (record) => ({
      book: record.book,
      passage: record.passage,
      keyVerse: record.keyVerse,
      reflection: record.reflection,
      application: record.application,
      sessionId: record.sessionId,
      updatedAt: toTime(record.updatedAt),
    }),
  },
  {
    findSame: async () => null,
    async allowed(db, userId, record) {
      if (record.sessionId === null) return true
      const session = await db.meditationSession.findUnique({
        where: { id: record.sessionId },
        select: { userId: true },
      })
      return session?.userId === userId
    },
  }
)

const highlight = ownedTable(
  "highlight",
  "Highlight",
  (db) => db.highlight,
  {
    toRecord: withTimes,
    toData: (record) => ({
      book: record.book,
      chapter: record.chapter,
      verse: record.verse,
      color: record.color,
      updatedAt: toTime(record.updatedAt),
    }),
  },
  {
    async findSame(db, userId, { book, chapter, verse }) {
      const row = await db.highlight.findUnique({
        where: { userId_book_chapter_verse: { userId, book, chapter, verse } },
      })
      return row && parse("highlight", withTimes(row))
    },
    allowed: async () => true,
  }
)

const reminder = ownedTable(
  "reminder",
  "Reminder",
  (db) => db.reminder,
  {
    toRecord: withTimes,
    toData: (record, now) => ({
      kind: record.kind,
      localTime: record.localTime,
      timezone: record.timezone,
      weekdays: record.weekdays,
      channels: record.channels,
      enabled: record.enabled,
      leadMinutes: record.leadMinutes,
      durationMinutes: record.durationMinutes,
      focusMode: record.focusMode,
      // As on the web: a disabled reminder has no next run for the cron.
      nextRunAt: record.enabled
        ? nextReminderRun(
            {
              localTime: record.localTime,
              timeZone: record.timezone,
              weekdays: record.weekdays,
            },
            now
          )
        : null,
      updatedAt: toTime(record.updatedAt),
    }),
  },
  {
    findSame: async () => null,
    async allowed(db, userId, _record, stored) {
      if (stored) return true
      return (
        (await db.reminder.count({ where: { userId } })) < maxRemindersPerUser
      )
    },
  }
)

const achievement = ownedTable(
  "achievement",
  "Achievement",
  (db) => db.achievement,
  {
    toRecord: (row) => ({
      ...withTimes(row),
      unlockedAt: fromDay(row.unlockedAt),
    }),
    toData: (record) => ({
      key: record.key,
      level: record.level,
      unlockedAt: toDay(record.unlockedAt),
      updatedAt: toTime(record.updatedAt),
    }),
    // Celebrated on the phone where it was earned.
    created: (now) => ({ seenAt: now }),
  },
  {
    async findSame(db, userId, { key, level }) {
      const row = await db.achievement.findUnique({
        where: { userId_key_level: { userId, key, level } },
      })
      return (
        row &&
        parse("achievement", {
          ...withTimes(row),
          unlockedAt: fromDay(row.unlockedAt),
        })
      )
    },
    allowed: async () => true,
  }
)

/** Every synced table, in the order parents come before their children. */
export const syncAccess: { [T in SyncTable]: TableAccess<T> } = {
  readingPlan,
  planEnrollment,
  readingProgress,
  prayerRequest,
  prayerLog,
  meditationSession,
  meditationNote,
  highlight,
  reminder,
  achievement,
}
