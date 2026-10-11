import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { routing } from "@/i18n/routing"

type AuthPage =
  "signIn" | "signUp" | "verifyEmail" | "forgotPassword" | "resetPassword"

/** `<title>` of an authentication page ("Connexion · Bible Plan"). */
export async function getAuthMetadata(
  params: Promise<{ locale: string }>,
  page: AuthPage
): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Auth.meta" })
  // Auth pages are not useful in search results.
  return { title: `${t(page)} · Bible Plan`, robots: { index: false } }
}
