import { describe, expect, it } from "vitest"

import {
  formatInviteCode,
  generateInviteCode,
  inviteCodeLength,
  normalizeInviteCode,
} from "./invite-code"
import {
  canChangeRoles,
  canDeleteGroup,
  canManageMembers,
  canRemoveMember,
  groupInputSchema,
  groupRoles,
} from "./schema"

describe("invite codes", () => {
  it("makes codes of the right length, made only of readable characters", () => {
    for (let run = 0; run < 200; run++) {
      const code = generateInviteCode((max) => Math.floor(Math.random() * max))
      expect(code).toHaveLength(inviteCodeLength)
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
      expect(code).not.toMatch(/[01OIL]/)
    }
  })

  it("uses the numbers it is given, so tests can predict a code", () => {
    expect(generateInviteCode(() => 0)).toBe("AAAAAAAA")
    expect(generateInviteCode((max) => max - 1)).toBe("99999999")
  })

  it("reads a code however it was typed", () => {
    expect(normalizeInviteCode("abcd-efgh")).toBe("ABCDEFGH")
    expect(normalizeInviteCode("  ab cd ef gh ")).toBe("ABCDEFGH")
    expect(normalizeInviteCode("ABCDEFGH")).toBe("ABCDEFGH")
  })

  it("refuses what cannot be a code", () => {
    expect(normalizeInviteCode("")).toBeNull()
    expect(normalizeInviteCode("ABCDEFG")).toBeNull()
    expect(normalizeInviteCode("ABCDEFGHJ")).toBeNull()
    // 0, O, 1, I and L are never in a code.
    expect(normalizeInviteCode("ABCDEF0H")).toBeNull()
    expect(normalizeInviteCode("ABCDEFIH")).toBeNull()
  })

  it("formats in two groups of four, which reads back", () => {
    expect(formatInviteCode("ABCDEFGH")).toBe("ABCD-EFGH")
    expect(normalizeInviteCode(formatInviteCode("ABCDEFGH"))).toBe("ABCDEFGH")
  })
})

describe("what a role can do", () => {
  it("lets only the owner and the administrators manage members", () => {
    expect(groupRoles.filter(canManageMembers)).toEqual(["OWNER", "ADMIN"])
  })

  it("lets the owner remove anyone but themselves-as-owner", () => {
    expect(canRemoveMember("OWNER", "ADMIN")).toBe(true)
    expect(canRemoveMember("OWNER", "MEMBER")).toBe(true)
    expect(canRemoveMember("OWNER", "OWNER")).toBe(false)
  })

  it("lets an administrator remove plain members only", () => {
    expect(canRemoveMember("ADMIN", "MEMBER")).toBe(true)
    expect(canRemoveMember("ADMIN", "ADMIN")).toBe(false)
    expect(canRemoveMember("ADMIN", "OWNER")).toBe(false)
  })

  it("lets a plain member remove nobody", () => {
    for (const target of groupRoles) {
      expect(canRemoveMember("MEMBER", target)).toBe(false)
    }
  })

  it("keeps roles and deletion to the owner", () => {
    expect(groupRoles.filter(canChangeRoles)).toEqual(["OWNER"])
    expect(groupRoles.filter(canDeleteGroup)).toEqual(["OWNER"])
  })
})

describe("groupInputSchema", () => {
  it("trims the name and turns an empty description into none", () => {
    expect(
      groupInputSchema.parse({ name: "  Cellule du jeudi ", description: " " })
    ).toEqual({ name: "Cellule du jeudi", description: null })
  })

  it("wants a name", () => {
    expect(groupInputSchema.safeParse({ name: "   " }).success).toBe(false)
    expect(groupInputSchema.safeParse({ name: "x".repeat(81) }).success).toBe(
      false
    )
  })
})
