"use client"

import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

import { Link, usePathname } from "@/i18n/navigation"

/** The most the badge shows before "99+". */
const maxBadge = 99

/**
 * Link to the notifications page, with the number of unread notifications on
 * a badge.
 */
export function NotificationBell({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  const t = useTranslations("Notifications")
  const active = usePathname().startsWith("/notifications")

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? t("bell.unread", { count }) : t("bell.label")}
      title={t("bell.label")}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full transition-colors outline-none hover:bg-brand-night/[0.06] focus-visible:ring-3 focus-visible:ring-ring/40 dark:hover:bg-white/10",
        className
      )}
    >
      <Bell aria-hidden className={cn("size-5", active && "text-brand-gold")} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-brand-gold px-1 text-[0.65rem] leading-4.5 font-semibold text-neutral-950"
        >
          {count > maxBadge ? `${maxBadge}+` : count}
        </span>
      )}
    </Link>
  )
}
