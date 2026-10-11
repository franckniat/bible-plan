import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { AuthCard } from "@/components/auth/auth-card"
import { ForgotPasswordForm } from "@/components/auth/auth-email-forms"
import { getAuthMetadata } from "@/components/auth/auth-metadata"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

export function generateMetadata({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  return getAuthMetadata(params, "forgotPassword")
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations("Auth.forgotPassword")
  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={<Link href="/sign-in">{t("backToSignIn")}</Link>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
