import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { isGoogleAuthEnabled } from "@workspace/auth"

import { AuthCard } from "@/components/auth/auth-card"
import { getAuthMetadata } from "@/components/auth/auth-metadata"
import { GoogleSignIn } from "@/components/auth/google-sign-in"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { Link, redirect } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { getSession } from "@/server/session"

export function generateMetadata({ params }: PageProps<"/[locale]/sign-up">) {
  return getAuthMetadata(params, "signUp")
}

export default async function SignUpPage({
  params,
}: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  if (await getSession()) return redirect({ href: "/today", locale })

  const t = await getTranslations("Auth")
  return (
    <AuthCard
      title={t("signUp.title")}
      description={t("signUp.description")}
      footer={
        <>
          {t("signUp.hasAccount")}{" "}
          <Link href="/sign-in">{t("signUp.signInLink")}</Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {isGoogleAuthEnabled() && (
          <GoogleSignIn redirectTo={`/${locale}/today`} />
        )}
        <SignUpForm />
      </div>
    </AuthCard>
  )
}
