import type { ReactNode } from "react"

import { requireUser } from "@/server/session"

/** Signed-in area: every page below requires a valid session. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser()
  return children
}
