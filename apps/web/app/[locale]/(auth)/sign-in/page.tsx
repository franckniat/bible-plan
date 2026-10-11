import { notFound, redirect } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { isGoogleAuthEnabled } from "@workspace/auth"

import { AuthCard, AuthNotice } from "@/components/auth/auth-card"
import { getAuthMetadata } from "@/components/auth/auth-metadata"
import { GoogleSignIn } from "@/components/auth/google-sign-in"
import { SignInForm } from "@/components/auth/sign-in-form"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { getSafeRedirect } from "@/lib/safe-redirect"
import { getSession } from "@/server/session"

export function generateMetadata({ params }: PageProps<"/[locale]/sign-in">) {
  return getAuthMetadata(params, "signIn")
}

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  // Where to go after signing in (set by proxy.ts), the Today page otherwise.
  const { redirect: requested, error } = await searchParams
  const redirectTo = getSafeRedirect(requested, `/${locale}/today`)
  if (await getSession()) redirect(redirectTo)

  const t = await getTranslations("Auth")
  return (
    <AuthCard
      title={t("signIn.title")}
      description={t("signIn.description")}
      footer={
        <>
          {t("signIn.noAccount")}{" "}
          <Link href="/sign-up">{t("signIn.signUpLink")}</Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <AuthNotice tone="error">{t("social.error")}</AuthNotice>}
        {isGoogleAuthEnabled() && <GoogleSignIn redirectTo={redirectTo} />}
        <SignInForm redirectTo={redirectTo} />
      </div>
    </AuthCard>
  )
}
