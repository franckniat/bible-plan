import {
  groupDetailSchema,
  groupListSchema,
  groupPlanListSchema,
} from "@workspace/core"
import { useQuery } from "@tanstack/react-query"

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
