import { UsersIcon } from "lucide-react"
import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { maxMembersPerGroup } from "@workspace/core"
import { prisma } from "@workspace/db"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

import { JoinInvite } from "@/components/groups/join-invite"
import { Link, redirect } from "@/i18n/navigation"
import { previewInvite } from "@/server/services/groups"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "Bible Plan",
  // An invitation is for the person who got it.
  robots: { index: false },
}

/**
 * The page an invitation link opens: the person has to be signed in (the
 * proxy sends a visitor to sign in and back here), then sees the group and
 * chooses to join it.
 */
export default async function JoinPage({
  params,
}: PageProps<"/[locale]/join/[code]">) {
  const { code: rawCode } = await params
  const code = decodeURIComponent(rawCode)
  const user = await requireUser()
  const t = await getTranslations("Groups.joinPage")
  const group = await previewInvite(prisma, code)

  if (!group) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>{t("notFound.title")}</EmptyTitle>
          <EmptyDescription>{t("notFound.description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/groups" className={buttonVariants()}>
            {t("toGroups")}
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  // Already in: straight to the group.
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    select: { role: true },
  })
  if (membership) {
    redirect({ href: `/groups/${group.id}`, locale: await getLocale() })
  }

  return (
    <JoinInvite
      code={code}
      name={group.name}
      description={group.description}
      memberCount={group.memberCount}
      full={group.memberCount >= maxMembersPerGroup}
    />
  )
}
