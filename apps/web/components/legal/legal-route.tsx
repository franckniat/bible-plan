import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { ComponentType } from "react"

import type { Locale } from "@workspace/core"

import { SiteShell } from "@/components/landing/site-shell"
import { LegalPage } from "@/components/legal/legal-page"
import { routing } from "@/i18n/routing"

export type LegalDocument = {
  kind: "privacy" | "terms"
  /** Date of the last change to the text, shown at the top of the page. */
  updatedAt: Date
  content: Record<Locale, ComponentType>
}

type LegalParams = { params: Promise<{ locale: string }> }

export async function getLegalMetadata(
  { kind }: LegalDocument,
  { params }: LegalParams
): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}

  const t = await getTranslations({ locale, namespace: "Legal" })
  return {
    title: `${t(`${kind}.title`)} · Bible Plan`,
    description: t(`${kind}.description`),
  }
}

export async function LegalRoute({
  document,
  params,
}: LegalParams & { document: LegalDocument }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const t = await getTranslations("Legal")
  const Content = document.content[locale]

  return (
    <SiteShell>
      <LegalPage
        title={t(`${document.kind}.title`)}
        updated={t("updated", { date: document.updatedAt })}
      >
        <Content />
      </LegalPage>
    </SiteShell>
  )
}
