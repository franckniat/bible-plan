import { describe, expect, it } from "vitest"

import { groupDetailSchema, groupListSchema } from "./api"

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
})
