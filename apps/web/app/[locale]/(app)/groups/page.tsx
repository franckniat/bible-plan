import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import { prisma } from "@workspace/db"

import { GroupsManager } from "@/components/groups/groups-manager"
import { routing } from "@/i18n/routing"
import { listGroups } from "@/server/services/groups"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/groups">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Groups" })
  return { title: `${t("title")} · Bible Plan` }
}

/** The groups of the person: a church, a cell, a family. */
export default async function GroupsPage() {
  const user = await requireUser()
  const t = await getTranslations("Groups")
  const groups = await listGroups(prisma, user.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <GroupsManager groups={groups} />
    </div>
  )
}
