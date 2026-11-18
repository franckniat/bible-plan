import { describe, expect, it } from "vitest"

import {
  dayThreadSchema,
  groupDetailSchema,
  groupListSchema,
  groupPlanListSchema,
  groupPrayerListSchema,
} from "./api"

/** What goes through the network: dates become ISO strings. */
const overTheWire = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value))

describe("group API schemas", () => {
  it("read the list of groups the website sends", () => {
    const sent = {
      groups: [
        {
          id: "g1",
          name: "Cellule du jeudi",
          description: null,
          role: "MEMBER",
          memberCount: 4,
        },
      ],
    }
    expect(groupListSchema.parse(overTheWire(sent))).toEqual(sent)
  })

  it("read a group whose members' dates were serialized", () => {
    const joinedAt = new Date("2026-11-02T08:30:00.000Z")
    const parsed = groupDetailSchema.parse(
      overTheWire({
        id: "g1",
        name: "Famille",
        description: "Le soir",
        inviteCode: "ABCD2345",
        role: "OWNER",
        members: [{ userId: "u1", name: "Anne", role: "OWNER", joinedAt }],
      })
    )
    expect(parsed.members[0]?.joinedAt).toBe(joinedAt.toISOString())
  })

  it("refuse a role the app does not know", () => {
    expect(
      groupListSchema.safeParse({
        groups: [
          {
            id: "g1",
            name: "x",
            description: null,
            role: "GUEST",
            memberCount: 1,
          },
        ],
      }).success
    ).toBe(false)
  })

  it("read the plans of a group with each member's progress", () => {
    const sent = {
      plans: [
        {
          id: "p1",
          title: "Évangiles",
          startDate: "2026-11-01",
          endDate: "2026-12-30",
          totalDays: 60,
          totalReadings: 89,
          members: [{ userId: "u1", name: "Anne", completedReadings: 12 }],
        },
      ],
    }
    expect(groupPlanListSchema.parse(overTheWire(sent))).toEqual(sent)
    expect(
      groupPlanListSchema.safeParse({
        plans: [{ ...sent.plans[0], startDate: "1 novembre" }],
      }).success
    ).toBe(false)
  })

  it("read a day's discussion with its answers", () => {
    const createdAt = new Date("2026-11-03T19:00:00.000Z")
    const comment = (id: string, replies: unknown[] = []) => ({
      id,
      authorId: "u1",
      authorName: "Anne",
      body: "Amen",
      createdAt,
      replies,
    })
    const parsed = dayThreadSchema.parse(
      overTheWire({
        groupId: "g1",
        date: "2026-11-03",
        role: "MEMBER",
        comments: [comment("c1", [comment("c2")])],
      })
    )
    expect(parsed.comments[0]?.replies[0]?.id).toBe("c2")
    expect(parsed.comments[0]?.createdAt).toBe(createdAt.toISOString())
  })

  it("read the prayers shared with a group", () => {
    const sent = {
      prayers: [
        {
          id: "r1",
          title: "Guérison de Paul",
          details: null,
          category: "FAMILY",
          status: "ACTIVE",
          passages: ["Jacques 5:16"],
          authorId: "u2",
          authorName: "Marc",
          answeredOn: null,
          supportCount: 3,
          supportedByMe: true,
        },
      ],
    }
    expect(groupPrayerListSchema.parse(overTheWire(sent))).toEqual(sent)
  })
})
