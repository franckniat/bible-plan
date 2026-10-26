import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { type Weekday } from "@workspace/core"
import { prisma } from "@workspace/db"
import { areEmailRemindersEnabled } from "@workspace/notifications"

import { PushSettings } from "@/components/reminders/push-settings"
import { RemindersManager } from "@/components/reminders/reminders-manager"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { getVapidPublicKey } from "@/server/push-config"
import { listPushDevices } from "@/server/services/push-devices"
import { listReminders } from "@/server/services/reminders"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/settings/reminders">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Reminders" })
  return { title: `${t("title")} · Bible Plan` }
}

/** Reminders to read, pray or meditate: when, which days, how. */
export default async function RemindersPage() {
  const user = await requireUser()
  const t = await getTranslations("Reminders")
  const reminders = await listReminders(prisma, user.id)
  const publicKey = getVapidPublicKey()
  const devices = publicKey ? await listPushDevices(prisma, user.id) : []

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/settings"
          className="flex w-fit items-center gap-1.5 text-sm text-brand-night/70 underline-offset-4 hover:underline dark:text-neutral-100/70"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t("description")}
          </p>
        </div>
      </div>

      {publicKey && (
        <PushSettings publicKey={publicKey} devices={devices.length} />
      )}

      <RemindersManager
        reminders={reminders.map((reminder) => ({
          id: reminder.id,
          kind: reminder.kind,
          localTime: reminder.localTime,
          weekdays: reminder.weekdays as Weekday[],
          channels: reminder.channels,
          enabled: reminder.enabled,
          leadMinutes: reminder.leadMinutes,
          durationMinutes: reminder.durationMinutes,
          focusMode: reminder.focusMode,
        }))}
        timeZone={user.timezone ?? "UTC"}
        emailEnabled={areEmailRemindersEnabled()}
        pushEnabled={publicKey !== null}
      />
    </div>
  )
}
