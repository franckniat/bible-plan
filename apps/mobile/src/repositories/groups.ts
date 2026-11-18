import {
  createdSchema,
  dayThreadSchema,
  doneSchema,
  groupDetailSchema,
  groupListSchema,
  groupPlanListSchema,
  groupPrayerListSchema,
  invitePreviewSchema,
  joinedSchema,
  prayingSchema,
  type GroupPrayerData,
} from "@workspace/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { useSession } from "@/lib/auth-client"

/**
 * The groups live on the website's server (online by nature): read through
 * TanStack Query and kept on the phone, so that the last known state stays
 * shown without network. Keys carry the account, so that one account never
 * sees what was kept for another.
 */
export const groupKeys = {
  all: (userId: string) => ["groups", userId] as const,
  list: (userId: string) => ["groups", userId, "list"] as const,
  detail: (userId: string, id: string) =>
    ["groups", userId, "detail", id] as const,
  plans: (userId: string, id: string) =>
    ["groups", userId, "plans", id] as const,
  prayers: (userId: string, id: string) =>
    ["groups", userId, "prayers", id] as const,
  day: (userId: string, planId: string, day: number) =>
    ["groups", userId, "day", planId, day] as const,
  invite: (userId: string, code: string) =>
    ["groups", userId, "invite", code] as const,
}

/** The id of the account signed in on the phone, if any. */
export function useAccountId(): string | null {
  const { data } = useSession()
  return data?.user.id ?? null
}

/** The groups of the person signed in. */
export function useGroups() {
  const userId = useAccountId()
  return useQuery({
    queryKey: groupKeys.list(userId ?? ""),
    queryFn: () => api("/groups", groupListSchema).then((r) => r.groups),
    enabled: userId !== null,
  })
}

/** A group and its members, for one of them. */
export function useGroup(id: string) {
  const userId = useAccountId()
  return useQuery({
    queryKey: groupKeys.detail(userId ?? "", id),
    queryFn: () => api(`/groups/${encodeURIComponent(id)}`, groupDetailSchema),
    enabled: userId !== null,
  })
}

/** The plans of a group, with how far each member is. */
export function useGroupPlans(id: string) {
  const userId = useAccountId()
  return useQuery({
    queryKey: groupKeys.plans(userId ?? "", id),
    queryFn: () =>
      api(`/groups/${encodeURIComponent(id)}/plans`, groupPlanListSchema).then(
        (r) => r.plans
      ),
    enabled: userId !== null,
  })
}

/** The prayer requests shared with a group. */
export function useGroupPrayers(id: string) {
  const userId = useAccountId()
  return useQuery({
    queryKey: groupKeys.prayers(userId ?? "", id),
    queryFn: () =>
      api(
        `/groups/${encodeURIComponent(id)}/prayers`,
        groupPrayerListSchema
      ).then((r) => r.prayers),
    enabled: userId !== null,
  })
}

/**
 * "I am praying for you" on a request of the group, given or taken back;
 * the list shows the server's count as soon as it answers.
 */
export function useTogglePraying(groupId: string) {
  const userId = useAccountId() ?? ""
  const client = useQueryClient()
  const key = groupKeys.prayers(userId, groupId)
  return useMutation({
    mutationFn: (requestId: string) =>
      api(`/prayers/${encodeURIComponent(requestId)}/support`, prayingSchema, {
        method: "POST",
        body: {},
      }),
    onSuccess: ({ praying, supportCount }, requestId) => {
      client.setQueryData<GroupPrayerData[]>(key, (prayers) =>
        prayers?.map((prayer) =>
          prayer.id === requestId
            ? { ...prayer, supportedByMe: praying, supportCount }
            : prayer
        )
      )
    },
  })
}

/** The discussion about a day of a group plan. */
export function useDayThread(planId: string, day: number) {
  const userId = useAccountId()
  return useQuery({
    queryKey: groupKeys.day(userId ?? "", planId, day),
    queryFn: () =>
      api(
        `/plans/${encodeURIComponent(planId)}/days/${day}/comments`,
        dayThreadSchema
      ),
    enabled: userId !== null,
  })
}

/** Writes a comment, or an answer, then reads the discussion again. */
export function useAddComment(planId: string, day: number) {
  const userId = useAccountId() ?? ""
  const client = useQueryClient()
  return useMutation({
    mutationFn: (comment: { body: string; parentId: string | null }) =>
      api(
        `/plans/${encodeURIComponent(planId)}/days/${day}/comments`,
        createdSchema,
        { method: "POST", body: comment }
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: groupKeys.day(userId, planId, day),
      }),
  })
}

/** Deletes a comment with its answers, then reads the discussion again. */
export function useDeleteComment(planId: string, day: number) {
  const userId = useAccountId() ?? ""
  const client = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api(`/comments/${encodeURIComponent(commentId)}`, doneSchema, {
        method: "DELETE",
      }),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: groupKeys.day(userId, planId, day),
      }),
  })
}

/** What the person sees of a group before joining it with its code. */
export function useInvitePreview(code: string | null) {
  const userId = useAccountId()
  return useQuery({
    queryKey: groupKeys.invite(userId ?? "", code ?? ""),
    queryFn: () =>
      api(`/invites/${encodeURIComponent(code ?? "")}`, invitePreviewSchema),
    enabled: userId !== null && code !== null,
    // An invitation is looked at once: never kept for offline.
    gcTime: 0,
  })
}

/** Joins a group with its code; the list of groups is read again. */
export function useJoinGroup() {
  const userId = useAccountId() ?? ""
  const client = useQueryClient()
  return useMutation({
    mutationFn: (code: string) =>
      api("/groups/join", joinedSchema, { method: "POST", body: { code } }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: groupKeys.list(userId) }),
  })
}
