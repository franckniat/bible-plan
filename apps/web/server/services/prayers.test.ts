import { describe, expect, it, vi } from "vitest"

import {
  maxPrayerRequestsPerUser,
  type PrayerRequestInput,
} from "@workspace/core"
import type { PrismaClient } from "@workspace/db"

import {
  countPrayers,
  createPrayer,
  deletePrayer,
  listPrayers,
  markAnswered,
  markPrayed,
  setPrayerStatus,
  updateAnswer,
  type PrayersDb,
} from "./prayers"

type RequestDb = Pick<PrismaClient, "prayerRequest">

const requestDb = (prayerRequest: Record<string, unknown>) =>
  ({ prayerRequest }) as unknown as RequestDb

const input: PrayerRequestInput = {
  title: "Pour Marie",
  details: null,
  category: "FAMILY",
  passages: ["Ps.51.1-4"],
}

describe("listPrayers", () => {
  it("lists the active requests of the user, least recently prayed first", async () => {
    const prayerRequest = { findMany: vi.fn().mockResolvedValue([]) }
    await listPrayers(requestDb(prayerRequest), "user-1", "ACTIVE", "FAMILY")
    const args = prayerRequest.findMany.mock.calls[0]![0]
    expect(args.where).toEqual({
      userId: "user-1",
      status: "ACTIVE",
      category: "FAMILY",
    })
    expect(args.orderBy[0]).toEqual({
      lastPrayedAt: { sort: "asc", nulls: "first" },
    })
  })

  it("shows the latest answer first among the answered ones", async () => {
    const prayerRequest = { findMany: vi.fn().mockResolvedValue([]) }
    await listPrayers(requestDb(prayerRequest), "user-1", "ANSWERED")
    const args = prayerRequest.findMany.mock.calls[0]![0]
    expect(args.where).toEqual({ userId: "user-1", status: "ANSWERED" })
    expect(args.orderBy[0]).toEqual({ answeredOn: "desc" })
  })
})

describe("countPrayers", () => {
  it("counts every status, including the empty ones", async () => {
    const prayerRequest = {
      groupBy: vi.fn().mockResolvedValue([
        { status: "ACTIVE", _count: { _all: 3 } },
        { status: "ANSWERED", _count: { _all: 1 } },
      ]),
    }
    expect(await countPrayers(requestDb(prayerRequest), "user-1")).toEqual({
      ACTIVE: 3,
      ANSWERED: 1,
      ARCHIVED: 0,
    })
  })
})

describe("createPrayer", () => {
  it("creates a request for the user", async () => {
    const prayerRequest = {
      count: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockResolvedValue({}),
    }
    expect(
      await createPrayer(requestDb(prayerRequest), "user-1", input, "2026-10-20")
    ).toEqual({ ok: true })
    // Without a start date, the request starts today.
    expect(prayerRequest.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        ...input,
        startedOn: new Date("2026-10-20T00:00:00Z"),
      },
    })
  })

  it("starts on the day the person chose", async () => {
    const prayerRequest = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    }
    await createPrayer(
      requestDb(prayerRequest),
      "user-1",
      { ...input, startedOn: "2026-09-01" },
      "2026-10-20"
    )
    expect(prayerRequest.create.mock.calls[0]![0].data.startedOn).toEqual(
      new Date("2026-09-01T00:00:00Z")
    )
  })

  it("refuses past the limit", async () => {
    const prayerRequest = {
      count: vi.fn().mockResolvedValue(maxPrayerRequestsPerUser),
      create: vi.fn(),
    }
    expect(
      await createPrayer(requestDb(prayerRequest), "user-1", input, "2026-10-20")
    ).toEqual({ ok: false, error: "limit" })
    expect(prayerRequest.create).not.toHaveBeenCalled()
  })
})

describe("markPrayed", () => {
  function prayersDb(found: unknown) {
    const prayerLog = { create: vi.fn((args) => args) }
    const prayerRequest = {
      findFirst: vi.fn().mockResolvedValue(found),
      update: vi.fn((args) => args),
    }
    const transaction = vi.fn(async (operations: unknown[]) => operations)
    return {
      typed: {
        prayerLog,
        prayerRequest,
        $transaction: transaction,
      } as unknown as PrayersDb,
      prayerLog,
      prayerRequest,
      transaction,
    }
  }

  it("sets the date of the last prayer and counts it, in one go", async () => {
    const now = new Date("2026-10-20T08:00:00Z")
    const { typed, prayerLog, prayerRequest, transaction } = prayersDb({
      id: "p1",
    })
    expect(await markPrayed(typed, "user-1", "p1", now)).toEqual({ ok: true })
    expect(prayerRequest.findFirst).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1", status: "ACTIVE" },
      select: { id: true },
    })
    expect(prayerLog.create).toHaveBeenCalledWith({
      data: { requestId: "p1", userId: "user-1", prayedAt: now },
    })
    expect(prayerRequest.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { lastPrayedAt: now, prayerCount: { increment: 1 } },
    })
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it("does not pray for the request of someone else, or a closed one", async () => {
    const { typed, prayerLog, transaction } = prayersDb(null)
    expect(await markPrayed(typed, "user-1", "p1")).toEqual({
      ok: false,
      error: "notFound",
    })
    expect(prayerLog.create).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })
})

describe("changes of a request", () => {
  it("marks an active request answered, on the day chosen, with its circumstances", async () => {
    const prayerRequest = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
    expect(
      await markAnswered(
        requestDb(prayerRequest),
        "user-1",
        "p1",
        { answeredOn: "2026-10-18", answerNote: "Elle va mieux." },
        "2026-10-20"
      )
    ).toEqual({ ok: true })
    expect(prayerRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1", status: "ACTIVE" },
      data: {
        status: "ANSWERED",
        answeredOn: new Date("2026-10-18T00:00:00Z"),
        answerNote: "Elle va mieux.",
      },
    })
  })

  it("answers today when no day is given, and corrects an answer later", async () => {
    const prayerRequest = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
    await markAnswered(
      requestDb(prayerRequest),
      "user-1",
      "p1",
      { answerNote: null },
      "2026-10-20"
    )
    expect(prayerRequest.updateMany.mock.calls[0]![0].data.answeredOn).toEqual(
      new Date("2026-10-20T00:00:00Z")
    )
    await updateAnswer(requestDb(prayerRequest), "user-1", "p1", {
      answerNote: "Précision.",
    })
    expect(prayerRequest.updateMany).toHaveBeenLastCalledWith({
      where: { id: "p1", userId: "user-1", status: "ANSWERED" },
      data: { answerNote: "Précision." },
    })
  })

  it("reports a request that is not the user's as missing", async () => {
    const prayerRequest = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
    expect(
      await setPrayerStatus(requestDb(prayerRequest), "user-1", "p1", "ARCHIVED")
    ).toEqual({ ok: false, error: "notFound" })
    expect(prayerRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1" },
      data: { status: "ARCHIVED" },
    })
  })

  it("deletes only the request of the user", async () => {
    const prayerRequest = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) }
    expect(await deletePrayer(requestDb(prayerRequest), "user-1", "p1")).toEqual({
      ok: true,
    })
    expect(prayerRequest.deleteMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1" },
    })
  })
})
