"use client"

import { CheckCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTransition, type ReactNode } from "react"

import { Button } from "@workspace/ui/components/button"

import { Link } from "@/i18n/navigation"
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications"

/** Marks everything as read. */
export function MarkAllReadButton() {
  const t = useTranslations("Notifications")
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsReadAction())}
    >
      <CheckCheck />
      {t("markAllRead")}
    </Button>
  )
}

/**
 * A notification that leads somewhere: opening it marks it as read. Without a
 * destination, a button that only marks it as read.
 */
export function NotificationLink({
  id,
  href,
  unread,
  className,
  children,
}: {
  id: string
  href: string | null
  unread: boolean
  className?: string
  children: ReactNode
}) {
  const markRead = () => {
    if (unread) void markNotificationReadAction(id)
  }

  return href ? (
    <Link href={href} onClick={markRead} className={className}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={markRead} className={className}>
      {children}
    </button>
  )
}
