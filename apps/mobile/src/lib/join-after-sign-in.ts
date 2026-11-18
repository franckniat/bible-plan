import { joinedSchema } from "@workspace/core"
import { useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { useEffect } from "react"

import { api, ApiError } from "@/lib/api"
import { haptics } from "@/lib/haptics"
import { inviteToJoin } from "@/lib/pending-invite"
import { setPreferences, usePreferences } from "@/lib/preferences"
import { groupKeys, useAccountId } from "@/repositories/groups"

/**
 * Joins the group of an invitation opened without an account, as soon as
 * somebody is signed in, then opens it. Offline, it waits for the next time;
 * when the group cannot be joined, the invitation screen says why.
 */
export function useJoinAfterSignIn() {
  const accountId = useAccountId()
  const { pendingInvite } = usePreferences()
  const client = useQueryClient()

  useEffect(() => {
    if (!accountId || !pendingInvite) return
    const code = inviteToJoin(pendingInvite, Date.now())
    if (!code) {
      setPreferences({ pendingInvite: null })
      return
    }
    let current = true
    api("/groups/join", joinedSchema, { method: "POST", body: { code } })
      .then(({ groupId }) => {
        if (!current) return
        setPreferences({ pendingInvite: null })
        void client.invalidateQueries({ queryKey: groupKeys.list(accountId) })
        haptics.success()
        router.push({ pathname: "/group/[id]", params: { id: groupId } })
      })
      .catch((error: unknown) => {
        if (!current) return
        if (error instanceof ApiError && error.code === "offline") return
        setPreferences({ pendingInvite: null })
        router.push({ pathname: "/join/[code]", params: { code } })
      })
    return () => {
      current = false
    }
  }, [accountId, pendingInvite, client])
}
