/**
 * A group invitation opened without an account: its code is kept on the
 * phone, and the group is joined as soon as the person is signed in (after
 * creating an account and confirming its address, or signing in). An old
 * invitation is dropped: the person may have moved on.
 */

export type PendingInvite = { code: string; at: number }

/** How long an invitation waits for the person to sign in. */
export const pendingInviteDays = 7

/** The code of the invitation to join now, or null if there is none any more. */
export function inviteToJoin(
  pending: PendingInvite | null,
  now: number
): string | null {
  if (!pending) return null
  const age = now - pending.at
  return age >= 0 && age <= pendingInviteDays * 24 * 60 * 60 * 1000
    ? pending.code
    : null
}
