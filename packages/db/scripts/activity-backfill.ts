// Computes everyone's activity days again from their events (#64), as the
// web app now does after each reading, prayer or session. Running it again
// changes nothing.
// Usage: pnpm db:activity:backfill [--write]   (without --write: dry run)
import process from "node:process"

import { computeActivityDays, type ActivityDayTotals } from "@workspace/core"

import { prisma } from "../src/client"

const write = process.argv.includes("--write")

const key = (day: ActivityDayTotals) =>
  [
    day.day,
    day.readings,
    day.prayers,
    day.meditationSeconds,
    day.prayerSeconds,
  ].join("|")

const users = await prisma.user.findMany({
  select: { id: true, timezone: true },
})
let changedUsers = 0
let changedDays = 0

for (const user of users) {
  const [readings, prayers, sessions, stored] = await Promise.all([
    prisma.readingProgress.findMany({
      where: { enrollment: { userId: user.id } },
      select: { completedAt: true },
    }),
    prisma.prayerLog.findMany({
      where: { userId: user.id },
      select: { prayedAt: true },
    }),
    prisma.meditationSession.findMany({
      where: { userId: user.id },
      select: { kind: true, durationSeconds: true, createdAt: true },
    }),
    prisma.activityDay.findMany({ where: { userId: user.id } }),
  ])
  const days = computeActivityDays(
    [
      ...readings.map((row) => ({
        type: "reading" as const,
        at: row.completedAt,
      })),
      ...prayers.map((row) => ({ type: "prayer" as const, at: row.prayedAt })),
      ...sessions.map((row) => ({
        type: "session" as const,
        kind: row.kind,
        seconds: row.durationSeconds,
        at: row.createdAt,
      })),
    ],
    user.timezone
  )

  const before = new Set(
    stored
      .map((row) => ({ ...row, day: row.day.toISOString().slice(0, 10) }))
      .filter(
        (row) =>
          row.readings > 0 ||
          row.prayers > 0 ||
          row.meditationSeconds > 0 ||
          row.prayerSeconds > 0
      )
      .map(key)
  )
  const after = new Set(days.map(key))
  const differences =
    [...before].filter((day) => !after.has(day)).length +
    [...after].filter((day) => !before.has(day)).length
  if (differences === 0) continue
  changedUsers++
  changedDays += differences

  if (write) {
    await prisma.$transaction([
      prisma.activityDay.deleteMany({ where: { userId: user.id } }),
      prisma.activityDay.createMany({
        data: days.map(({ day, ...totals }) => ({
          userId: user.id,
          day: new Date(`${day}T00:00:00.000Z`),
          ...totals,
        })),
      }),
    ])
  }
}

console.log(
  `${users.length} people, ${changedUsers} with a different activity ` +
    `(${changedDays} day rows added or removed)` +
    (write ? ": written." : ". Dry run, run with --write to store it.")
)
await prisma.$disconnect()
