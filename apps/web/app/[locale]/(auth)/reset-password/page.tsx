import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { buttonVariants } from "@workspace/ui/components/button"

import { AuthCard, AuthNotice } from "@/components/auth/auth-card"
import { getAuthMetadata } from "@/components/auth/auth-metadata"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

export function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">) {
  return getAuthMetadata(params, "resetPassword")
}

/** Reached from the reset email: ?token=… (or ?error=… when the link is invalid). */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations("Auth.resetPassword")
  const { token, error } = await searchParams

  if (error || typeof token !== "string" || !token) {
    return (
      <AuthCard title={t("invalidTitle")}>
        <div className="flex flex-col gap-5">
          <AuthNotice tone="error">{t("invalidDescription")}</AuthNotice>
          <Link
            href="/forgot-password"
            className={buttonVariants({ size: "lg", className: "h-11 w-full" })}
          >
            {t("requestNew")}
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <ResetPasswordForm token={token} />
    </AuthCard>
  )
}
