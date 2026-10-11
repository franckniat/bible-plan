import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { AuthCard } from "@/components/auth/auth-card"
import { SignInForm } from "@/components/auth/sign-in-form"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { getSafeRedirect } from "@/lib/safe-redirect"
import { getSession } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Auth.meta" })
  return { title: `${t("signIn")} · Bible Plan` }
}

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  // Where to go after signing in (set by proxy.ts), the Today page otherwise.
  const redirectTo = getSafeRedirect(
    (await searchParams).redirect,
    `/${locale}/today`
  )
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
      <SignInForm redirectTo={redirectTo} />
    </AuthCard>
  )
}
