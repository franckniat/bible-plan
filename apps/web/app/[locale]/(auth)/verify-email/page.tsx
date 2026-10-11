import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { buttonVariants } from "@workspace/ui/components/button"

import { AuthCard, AuthNotice } from "@/components/auth/auth-card"
import { NewVerificationLinkForm } from "@/components/auth/auth-email-forms"
import { getAuthMetadata } from "@/components/auth/auth-metadata"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { getSession } from "@/server/session"

export function generateMetadata({
  params,
}: PageProps<"/[locale]/verify-email">) {
  return getAuthMetadata(params, "verifyEmail")
}

/**
 * Landing page of the confirmation link: better-auth verifies the token,
 * signs the user in and redirects here (with ?error= when the link is invalid).
 */
export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations("Auth.verifyEmail")
  const { error } = await searchParams
  const session = error ? null : await getSession()

  if (session?.user.emailVerified) {
    return (
      <AuthCard title={t("successTitle")} description={t("successDescription")}>
        <Link
          href="/today"
          className={buttonVariants({ size: "lg", className: "h-11 w-full" })}
        >
          {t("start")}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={error ? t("errorTitle") : t("pendingTitle")}
      footer={<Link href="/sign-in">{t("signIn")}</Link>}
    >
      <div className="flex flex-col gap-5">
        <AuthNotice tone={error ? "error" : "success"}>
          {error ? t("errorDescription") : t("pendingDescription")}
        </AuthNotice>
        <NewVerificationLinkForm />
      </div>
    </AuthCard>
  )
}
