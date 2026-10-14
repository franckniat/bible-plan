import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { localeSchema, defaultLocale } from "@workspace/core"

import { ProfileForm } from "@/components/settings/profile-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { routing } from "@/i18n/routing"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Settings" })
  return { title: `${t("title")} · Bible Plan` }
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-3xl bg-white/85 p-6 shadow-sm ring-1 ring-brand-night/10 sm:p-8 dark:bg-neutral-900/85 dark:ring-white/10"
    >
      <div className="mb-6">
        <h2 id={`${id}-title`} className="font-heading text-xl font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-brand-night/70 dark:text-neutral-100/70">
          {description}
        </p>
      </div>
      {children}
    </section>
  )
}

export default async function SettingsPage() {
  const user = await requireUser()
  const t = await getTranslations("Settings")

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>

      <SettingsSection
        id="profile"
        title={t("profile.title")}
        description={t("profile.description")}
      >
        <ProfileForm
          values={{
            name: user.name,
            email: user.email,
            locale: localeSchema.catch(defaultLocale).parse(user.locale),
            timezone: user.timezone ?? null,
            readingWpm: user.readingWpm,
          }}
        />
      </SettingsSection>

      <SettingsSection
        id="appearance"
        title={t("appearance.title")}
        description={t("appearance.description")}
      >
        <ThemeToggle showLabels className="flex w-full max-w-md" />
      </SettingsSection>
    </div>
  )
}
