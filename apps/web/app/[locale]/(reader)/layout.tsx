import type { ReactNode } from "react"

import { AppShell } from "@/components/app/app-shell"
import { PublicReaderShell } from "@/components/reader/public-reader-shell"
import { getSession } from "@/server/session"

/**
 * The Bible reader is open to everyone: signed-in users keep the app frame,
 * visitors get the public one (with an invitation to sign up).
 */
export default async function ReaderLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSession()
  if (session) return <AppShell user={session.user}>{children}</AppShell>
  return <PublicReaderShell>{children}</PublicReaderShell>
}
