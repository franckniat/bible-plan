import type { ReactNode } from "react"

import { AppShell } from "@/components/app/app-shell"
import { requireUser } from "@/server/session"

/** Signed-in area: every page below requires a valid session. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  return <AppShell user={user}>{children}</AppShell>
}
