import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { z } from "zod"

import { canManageMembers } from "@workspace/core"
import { prisma } from "@workspace/db"

import { GroupPlans } from "@/components/groups/group-plans"
import { GroupView } from "@/components/groups/group-view"
import { Link } from "@/i18n/navigation"
import { listGroupPlans } from "@/server/services/group-plans"
import { getGroup } from "@/server/services/groups"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "Bible Plan",
  // A group is private to its members.
  robots: { index: false },
}

/** A group, for its members: who is in it, how to invite, what to manage. */
export default async function GroupPage({
  params,
}: PageProps<"/[locale]/groups/[id]">) {
  const { id } = await params
  const user = await requireUser()
  // Not an id, not a member, not there: the same page, nothing is revealed.
  if (!z.uuid().safeParse(id).success) notFound()
  const group = await getGroup(prisma, user.id, id)
  if (!group) notFound()

  const plans = (await listGroupPlans(prisma, user.id, id)) ?? []
  const t = await getTranslations("Groups")
  const locale = await getLocale()
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: user.timezone || "UTC",
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/groups"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
        </div>
      </div>
      <GroupPlans
        groupId={group.id}
        plans={plans}
        currentUserId={user.id}
        canCreate={canManageMembers(group.role)}
      />
      <GroupView
        currentUserId={user.id}
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          inviteCode: group.inviteCode,
          role: group.role,
          members: group.members.map((member) => ({
            userId: member.userId,
            name: member.name,
            role: member.role,
            joined: formatDate.format(member.joinedAt),
          })),
        }}
      />
    </div>
  )
}
