import { describe, expect, it } from "vitest"

import {
  canDeleteComment,
  commentInputSchema,
  maxCommentLength,
} from "./comments"
import { groupRoles } from "./schema"

describe("commentInputSchema", () => {
  it("trims the text and starts a thread when there is no parent", () => {
    expect(commentInputSchema.parse({ body: "  Belle lecture !  " })).toEqual({
      body: "Belle lecture !",
      parentId: null,
    })
  })

  it("wants some text, not too long", () => {
    expect(commentInputSchema.safeParse({ body: "   " }).success).toBe(false)
    expect(
      commentInputSchema.safeParse({ body: "x".repeat(maxCommentLength + 1) })
        .success
    ).toBe(false)
    expect(
      commentInputSchema.safeParse({ body: "x".repeat(maxCommentLength) }).success
    ).toBe(true)
  })

  it("only answers with a real id", () => {
    expect(
      commentInputSchema.safeParse({ body: "Oui", parentId: "not-an-id" })
        .success
    ).toBe(false)
  })
})

describe("canDeleteComment", () => {
  it("lets the author delete their comment, whatever their role", () => {
    for (const role of groupRoles) {
      expect(canDeleteComment("me", "me", role)).toBe(true)
    }
  })

  it("lets those who manage the group delete the comment of someone else", () => {
    expect(canDeleteComment("other", "me", "OWNER")).toBe(true)
    expect(canDeleteComment("other", "me", "ADMIN")).toBe(true)
  })

  it("does not let a plain member delete the comment of someone else", () => {
    expect(canDeleteComment("other", "me", "MEMBER")).toBe(false)
  })
})
