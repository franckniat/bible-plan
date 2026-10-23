import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { AuthCard } from "@/components/auth/auth-card"
import { getAuthMetadata } from "@/components/auth/auth-metadata"
import { ConsentForm } from "@/components/consent/consent-form"
import { SignOutButton } from "@/components/app/sign-out-button"
import { redirect } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { needsConsent } from "@/server/services/account"
import { requireUser } from "@/server/session"

export function generateMetadata({
  params,
}: PageProps<"/[locale]/consent">) {
  return getAuthMetadata(params, "consent")
}

/**
 * Asked once after signing in, whatever the way (password, e-mail link,
 * Google), and again when the privacy policy or terms change.
 */
export default async function ConsentPage({
  params,
}: PageProps<"/[locale]/consent">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const user = await requireUser()
  if (!needsConsent(user)) return redirect({ href: "/today", locale })

  const t = await getTranslations("Consent")
  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={<SignOutButton />}
    >
      <ConsentForm />
    </AuthCard>
  )
}
