import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { z } from "zod"

import type { Locale } from "@workspace/core"
import { prisma } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"

import { CommentThread, type CommentRow } from "@/components/groups/comment-thread"
import { toChecklist } from "@/components/plans/checklist"
import { ReadingChecklist } from "@/components/plans/reading-checklist"
import { Link } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import { getDayThread, type CommentView } from "@/server/services/comments"
import { getPlan } from "@/server/services/plans"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "Bible Plan",
  // A discussion is private to the group.
  robots: { index: false },
}

/**
 * The readings of a day of a group plan, and the discussion of the group about
 * them. Members only: anybody else (and any plan that is not a group's) gets
 * the same "not found".
 */
export default async function PlanDayPage({
  params,
}: PageProps<"/[locale]/plans/[id]/days/[day]">) {
  const { id, day: dayParam } = await params
  const user = await requireUser()
  const dayNumber = Number(dayParam)
  if (!z.uuid().safeParse(id).success || !Number.isInteger(dayNumber)) {
    notFound()
  }

  const plan = await getPlan(prisma, user.id, id)
  const day = plan?.days.find((item) => item.day === dayNumber)
  if (!plan || !plan.group || !day) notFound()
  const thread = await getDayThread(prisma, user.id, id, dayNumber)
  if (!thread) notFound()

  const t = await getTranslations("Comments")
  const locale = (await getLocale()) as Locale
  const formatTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: user.timezone || "UTC",
  })
  const toRow = (comment: CommentView): CommentRow => ({
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.authorName,
    body: comment.body,
    at: formatTime.format(comment.createdAt),
    replies: comment.replies.map(toRow),
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href={`/plans/${plan.id}`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t("backToPlan", { title: plan.title })}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold first-letter:uppercase">
            {formatIsoDate(day.date, locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {plan.title}
            <Badge variant="secondary">{plan.group.name}</Badge>
            <span>{t("day", { day: day.day, total: plan.totalDays })}</span>
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {t("readingsTitle")}
        </h2>
        <ReadingChecklist readings={toChecklist(day, plan.trackNames, locale)} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold">
          {t("discussionTitle")}
        </h2>
        <CommentThread
          planId={plan.id}
          dayNumber={dayNumber}
          comments={thread.comments.map(toRow)}
          currentUserId={user.id}
          role={thread.role}
        />
      </section>
    </div>
  )
}
