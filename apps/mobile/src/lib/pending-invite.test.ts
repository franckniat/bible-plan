import { describe, expect, it } from "vitest"

import { inviteToJoin, pendingInviteDays } from "./pending-invite"

const day = 24 * 60 * 60 * 1000
const at = Date.parse("2026-11-19T10:00:00Z")

describe("inviteToJoin", () => {
  it("gives nothing without an invitation", () => {
    expect(inviteToJoin(null, at)).toBeNull()
  })

  it("gives the code of a recent invitation", () => {
    expect(inviteToJoin({ code: "ABCD2345", at }, at + day)).toBe("ABCD2345")
  })

  it("drops an invitation older than its delay", () => {
    const pending = { code: "ABCD2345", at }
    expect(inviteToJoin(pending, at + pendingInviteDays * day)).toBe("ABCD2345")
    expect(inviteToJoin(pending, at + pendingInviteDays * day + 1)).toBeNull()
  })

  it("drops an invitation from the future (a clock set back)", () => {
    expect(inviteToJoin({ code: "ABCD2345", at }, at - day)).toBeNull()
  })
})
