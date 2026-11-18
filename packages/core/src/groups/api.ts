import { z } from "zod"

import { prayerCategories, prayerStatuses } from "../prayer/schema"
import { isoDateSchema } from "../schemas/common"
import { groupRoles } from "./schema"

/**
 * What the website's API (/api/v1) answers about groups, read by the mobile
 * app. Dates come as ISO strings (JSON). The app checks each answer with
 * these schemas, so a change on one side shows up in the tests of the other.
 */

const role = z.enum(groupRoles)

/** A group in the list of a person's groups. */
export const groupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  role,
  memberCount: z.number().int(),
})
export type GroupSummaryData = z.infer<typeof groupSummarySchema>

export const groupListSchema = z.object({
  groups: z.array(groupSummarySchema),
})

export const groupMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role,
  joinedAt: z.iso.datetime(),
})

/** A group and its members, for one of them. */
export const groupDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** Only for those who manage the members. */
  inviteCode: z.string().nullable(),
  role,
  members: z.array(groupMemberSchema),
})
export type GroupDetailData = z.infer<typeof groupDetailSchema>

/** How far a member is in a plan of the group. */
export const memberProgressSchema = z.object({
  userId: z.string(),
  name: z.string(),
  completedReadings: z.number().int(),
})

/** A plan of a group, followed by all its members on one calendar. */
export const groupPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  totalDays: z.number().int(),
  totalReadings: z.number().int(),
  /** The furthest first. */
  members: z.array(memberProgressSchema),
})
export type GroupPlanData = z.infer<typeof groupPlanSchema>

export const groupPlanListSchema = z.object({
  plans: z.array(groupPlanSchema),
})

/**
 * A prayer request shared with a group: what its members see of it, never
 * the answer note nor the journal.
 */
export const groupPrayerSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string().nullable(),
  category: z.enum(prayerCategories),
  status: z.enum(prayerStatuses),
  passages: z.array(z.string()),
  authorId: z.string(),
  authorName: z.string(),
  answeredOn: isoDateSchema.nullable(),
  supportCount: z.number().int(),
  supportedByMe: z.boolean(),
})
export type GroupPrayerData = z.infer<typeof groupPrayerSchema>

export const groupPrayerListSchema = z.object({
  prayers: z.array(groupPrayerSchema),
})

/** "I am praying for you", given or taken back. */
export const prayingSchema = z.object({
  praying: z.boolean(),
  supportCount: z.number().int(),
})

type CommentData = {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
  replies: CommentData[]
}

/** A comment on a day of a group plan, with its answers (one level). */
export const commentSchema: z.ZodType<CommentData> = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  get replies() {
    return z.array(commentSchema)
  },
})
export type { CommentData }

/** The discussion about a day of a group plan, oldest first. */
export const dayThreadSchema = z.object({
  groupId: z.string(),
  date: isoDateSchema,
  /** The role of the person in the group, for what they may delete. */
  role: z.enum(groupRoles),
  comments: z.array(commentSchema),
})
export type DayThreadData = z.infer<typeof dayThreadSchema>

/** A write that worked, with what it created when it did. */
export const createdSchema = z.object({ id: z.string() })
export const doneSchema = z.object({ ok: z.literal(true) })

/** What the API says when something is refused: a key of Groups.errors. */
export const apiErrorSchema = z.object({ error: z.string() })
