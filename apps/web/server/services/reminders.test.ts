import { describe, expect, it, vi } from "vitest"

import { maxRemindersPerUser, type ReminderInput } from "@workspace/core"

import {
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
  type RemindersDb,
} from "./reminders"

const input: ReminderInput = {
  kind: "READING",
  localTime: "07:00",
  timeZone: "Europe/Paris",
  weekdays: [1, 2, 3, 4, 5],
  channels: ["IN_APP", "PUSH", "EMAIL"],
  enabled: true,
}
// Thursday 2026-01-15, 06:00 in Paris.
const now = new Date("2026-01-15T05:00:00Z")

function db(reminder: Record<string, unknown>) {
  return { reminder } as unknown as RemindersDb
}

describe("createReminder", () => {
  it("stores the reminder with its next run", async () => {
    const reminder = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "r1" }),
    }
    const result = await createReminder(db(reminder), "user-1", input, { now })

    expect(result).toEqual({ ok: true, value: { id: "r1" } })
    expect(reminder.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        kind: "READING",
        localTime: "07:00",
        timezone: "Europe/Paris",
        weekdays: [1, 2, 3, 4, 5],
        channels: ["IN_APP", "PUSH"],
        enabled: true,
        nextRunAt: new Date("2026-01-15T06:00:00Z"),
      },
      select: { id: true },
    })
  })

  it("keeps the email channel only when emails are enabled", async () => {
    const reminder = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "r1" }),
    }
    await createReminder(db(reminder), "user-1", input, {
      now,
      emailEnabled: true,
    })
    expect(reminder.create.mock.calls[0]![0].data.channels).toEqual([
      "IN_APP",
      "PUSH",
      "EMAIL",
    ])
  })

  it("gives a disabled reminder no next run", async () => {
    const reminder = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "r1" }),
    }
    await createReminder(
      db(reminder),
      "user-1",
      { ...input, enabled: false },
      {
        now,
      }
    )
    expect(reminder.create.mock.calls[0]![0].data.nextRunAt).toBeNull()
  })

  it("refuses a reminder beyond the limit", async () => {
    const reminder = {
      count: vi.fn().mockResolvedValue(maxRemindersPerUser),
      create: vi.fn(),
    }
    expect(await createReminder(db(reminder), "user-1", input)).toEqual({
      ok: false,
      error: "limit",
    })
    expect(reminder.create).not.toHaveBeenCalled()
  })
})

describe("updateReminder", () => {
  it("updates a reminder of the user and schedules it again", async () => {
    const reminder = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
    const result = await updateReminder(
      db(reminder),
      "user-1",
      "r1",
      { ...input, localTime: "21:30" },
      { now }
    )

    expect(result).toEqual({ ok: true, value: undefined })
    const call = reminder.updateMany.mock.calls[0]![0]
    expect(call.where).toEqual({ id: "r1", userId: "user-1" })
    expect(call.data.nextRunAt).toEqual(new Date("2026-01-15T20:30:00Z"))
  })

  it("does not touch the reminder of someone else", async () => {
    const reminder = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
    expect(await updateReminder(db(reminder), "user-2", "r1", input)).toEqual({
      ok: false,
      error: "not_found",
    })
  })
})

describe("deleteReminder", () => {
  it("deletes only a reminder of the user", async () => {
    const reminder = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) }
    expect(await deleteReminder(db(reminder), "user-1", "r1")).toEqual({
      ok: true,
      value: undefined,
    })
    expect(reminder.deleteMany).toHaveBeenCalledWith({
      where: { id: "r1", userId: "user-1" },
    })
  })

  it("reports an unknown reminder", async () => {
    const reminder = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }
    expect(await deleteReminder(db(reminder), "user-1", "nope")).toEqual({
      ok: false,
      error: "not_found",
    })
  })
})

describe("listReminders", () => {
  it("lists the reminders of the user by time of day", async () => {
    const reminder = { findMany: vi.fn().mockResolvedValue([]) }
    await listReminders(db(reminder), "user-1")
    expect(reminder.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ localTime: "asc" }, { createdAt: "asc" }],
    })
  })
})
