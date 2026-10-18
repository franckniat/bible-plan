import { Bell } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import { prisma } from "@workspace/db"
import { cn } from "@workspace/ui/lib/utils"

import {
  MarkAllReadButton,
  NotificationLink,
} from "@/components/notifications/notification-actions"
import { routing } from "@/i18n/routing"
import {
  countUnread,
  listNotifications,
  notificationRetentionDays,
} from "@/server/services/notifications"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/notifications">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Notifications" })
  return { title: `${t("title")} · Bible Plan` }
}

/** What the app has to tell the user: due reminders, for now. */
export default async function NotificationsPage() {
  const user = await requireUser()
  const t = await getTranslations("Notifications")
  const locale = await getLocale()
  const [notifications, unread] = await Promise.all([
    listNotifications(prisma, user.id),
    countUnread(prisma, user.id),
  ])
  // In the day of the user, like the rest of the app.
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: user.timezone || "UTC",
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t("description", { days: notificationRetentionDays })}
          </p>
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20">
          <Bell aria-hidden className="size-6 text-brand-gold" />
          <h2 className="font-heading text-xl font-semibold">
            {t("empty.title")}
          </h2>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const unreadItem = notification.readAt === null
            return (
              <li key={notification.id}>
                <NotificationLink
                  id={notification.id}
                  href={notification.href}
                  unread={unreadItem}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-3xl p-5 text-left ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    unreadItem
                      ? "bg-brand-gold/15 ring-brand-gold/30 hover:bg-brand-gold/25"
                      : "bg-white/85 ring-brand-night/10 hover:bg-white dark:bg-neutral-900/85 dark:ring-white/10 dark:hover:bg-neutral-900"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 size-2 shrink-0 rounded-full",
                      unreadItem ? "bg-brand-gold" : "bg-transparent"
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium">
                      {unreadItem && (
                        <span className="sr-only">{t("unreadItem")} </span>
                      )}
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="text-sm text-brand-night/75 dark:text-neutral-100/75">
                        {notification.body}
                      </span>
                    )}
                    <time
                      dateTime={notification.createdAt.toISOString()}
                      className="text-xs text-brand-night/60 dark:text-neutral-100/60"
                    >
                      {formatDate.format(notification.createdAt)}
                    </time>
                  </span>
                </NotificationLink>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
