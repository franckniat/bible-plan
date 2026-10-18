import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { prisma } from "@workspace/db"
import { cn } from "@workspace/ui/lib/utils"

import { AppFooter } from "@/components/app/app-footer"
import { AppNav } from "@/components/app/app-nav"
import { SignOutButton } from "@/components/app/sign-out-button"
import { TimeZoneDetector } from "@/components/app/time-zone-detector"
import { BrandMark } from "@/components/brand/brand-mark"
import { brandThemeClassName } from "@/components/brand/brand-theme"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import { Link } from "@/i18n/navigation"
import { countUnread } from "@/server/services/notifications"
import type { SessionUser } from "@/server/session"

async function HomeLink() {
  const t = await getTranslations("App")
  return (
    <Link
      href="/today"
      aria-label={t("home")}
      className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <BrandMark className="h-7" />
      <span className="font-heading text-lg font-semibold tracking-tight">
        Bible Plan
      </span>
    </Link>
  )
}

function UserSummary({ user }: { user: SessionUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-night font-heading text-sm font-semibold text-brand-cream dark:bg-brand-gold dark:text-neutral-950"
      >
        {user.name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <div className="flex min-w-0 flex-col text-sm">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-brand-night/60 dark:text-neutral-100/60">
          {user.email}
        </span>
      </div>
    </div>
  )
}

/**
 * Signed-in area frame: sidebar on desktop; top bar and bottom navigation bar
 * on mobile.
 */
export async function AppShell({
  user,
  children,
}: {
  user: SessionUser
  children: ReactNode
}) {
  const unread = await countUnread(prisma, user.id)
  return (
    <div className={cn("flex min-h-svh", brandThemeClassName)}>
      {!user.timezone && <TimeZoneDetector />}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-8 border-r border-brand-night/10 px-3 py-6 md:flex dark:border-white/10 dark:bg-neutral-900/40">
        <div className="flex items-center justify-between gap-2 px-3">
          <HomeLink />
          <NotificationBell count={unread} />
        </div>
        <AppNav variant="sidebar" />
        <div className="mt-auto flex flex-col gap-3">
          <ThemeToggle className="mx-3 self-start" />
          <UserSummary user={user} />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-brand-night/10 bg-brand-cream/90 px-4 py-2 backdrop-blur md:hidden dark:border-white/10 dark:bg-neutral-950/90">
          <HomeLink />
          <div className="flex items-center gap-2">
            <NotificationBell count={unread} />
            <ThemeToggle />
            <SignOutButton iconOnly />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-10 md:py-10">
          {children}
        </main>
        <AppFooter />
      </div>

      <AppNav
        variant="bottom"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-night/10 bg-brand-cream/95 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden dark:border-white/10 dark:bg-neutral-950/95"
      />
    </div>
  )
}
