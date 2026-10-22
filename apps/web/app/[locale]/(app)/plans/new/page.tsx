import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { canManageMembers, getPlanTemplate, getToday } from "@workspace/core"
import { prisma } from "@workspace/db"

import { PlanWizard } from "@/components/plans/wizard/plan-wizard"
import { routing } from "@/i18n/routing"
import { listGroups } from "@/server/services/groups"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/plans/new">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "PlanWizard" })
  return { title: `${t("title")} · Bible Plan` }
}

export default async function NewPlanPage({
  searchParams,
}: PageProps<"/[locale]/plans/new">) {
  const user = await requireUser()
  const t = await getTranslations("PlanWizard")
  // ?template=<key> comes from the templates page.
  const { template, group } = await searchParams
  const templateKey =
    typeof template === "string" && getPlanTemplate(template) ? template : null
  // A plan can be made for a group the person manages (?group=<id> comes from
  // the page of the group).
  const groups = (await listGroups(prisma, user.id))
    .filter((summary) => canManageMembers(summary.role))
    .map(({ id, name }) => ({ id, name }))
  const groupId =
    typeof group === "string" && groups.some((item) => item.id === group)
      ? group
      : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>
      <PlanWizard
        today={getToday(user.timezone)}
        readingWpm={user.readingWpm}
        initialTemplateKey={templateKey}
        groups={groups}
        initialGroupId={groupId}
      />
    </div>
  )
}
