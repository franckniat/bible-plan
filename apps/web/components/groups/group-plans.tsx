"use client"

import {
  CalendarPlusIcon,
  CircleAlertIcon,
  CopyIcon,
  PlusIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Progress } from "@workspace/ui/components/progress"
import { Spinner } from "@workspace/ui/components/spinner"

import { Link, useRouter } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import { copyGroupPlanAction } from "@/server/actions/groups"
import type { GroupPlanView } from "@/server/services/group-plans"

/** Members shown under a plan before "show all". */
const FIRST_MEMBERS = 8

function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

/**
 * The plans of a group, with how far each member is, a way to copy a plan
 * into one's own plans, and (for those who manage the group) a way to make
 * a new one.
 */
export function GroupPlans({
  groupId,
  plans,
  currentUserId,
  canCreate,
}: {
  groupId: string
  plans: GroupPlanView[]
  currentUserId: string
  canCreate: boolean
}) {
  const t = useTranslations("Groups.plans")
  const locale = useLocale()
  const router = useRouter()
  const [error, setError] = useState(false)
  const [copying, setCopying] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  function copy(planId: string) {
    setError(false)
    setCopying(planId)
    startTransition(async () => {
      const result = await copyGroupPlanAction(planId).catch(
        () => ({ error: "unexpected" }) as const
      )
      setCopying(null)
      if ("error" in result) return setError(true)
      router.push(`/plans/${result.id}`)
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("title")}</h2>
        {canCreate && plans.length > 0 && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/plans/new?group=${groupId}`} />}
          >
            <PlusIcon data-icon="inline-start" />
            {t("create")}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{t("copyError")}</AlertDescription>
        </Alert>
      )}

      {plans.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlusIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>
              {canCreate ? t("empty.manager") : t("empty.member")}
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <Button
                nativeButton={false}
                render={<Link href={`/plans/new?group=${groupId}`} />}
              >
                <PlusIcon data-icon="inline-start" />
                {t("create")}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => {
            const mine = plan.members.find(
              (member) => member.userId === currentUserId
            )
            const showAll = expanded.has(plan.id)
            const shown = showAll
              ? plan.members
              : plan.members.slice(0, FIRST_MEMBERS)
            return (
              <li key={plan.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading text-lg">
                      <Link
                        href={`/plans/${plan.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {plan.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {t("dates", {
                        start: formatIsoDate(plan.startDate, locale, {
                          day: "numeric",
                          month: "long",
                        }),
                        end: formatIsoDate(plan.endDate, locale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }),
                        days: plan.totalDays,
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium">
                      {t("progressTitle")}
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {shown.map((member) => {
                        const value = percent(
                          member.completedReadings,
                          plan.totalReadings
                        )
                        return (
                          <li key={member.userId}>
                            <Progress
                              value={value}
                              aria-label={t("memberProgress", {
                                name: member.name,
                              })}
                              className="gap-1"
                            >
                              <span className="flex w-full items-baseline justify-between gap-3 text-sm">
                                <span className="font-medium">
                                  {member.name}
                                  {member.userId === currentUserId && (
                                    <span className="font-normal text-muted-foreground">
                                      {" "}
                                      {t("you")}
                                    </span>
                                  )}
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                  {t("readings", {
                                    done: member.completedReadings,
                                    total: plan.totalReadings,
                                  })}
                                </span>
                              </span>
                            </Progress>
                          </li>
                        )
                      })}
                    </ul>
                    {plan.members.length > FIRST_MEMBERS && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpanded((current) => {
                              const next = new Set(current)
                              if (showAll) next.delete(plan.id)
                              else next.add(plan.id)
                              return next
                            })
                          }
                        >
                          {showAll
                            ? t("showFewer")
                            : t("showAll", { count: plan.members.length })}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex-wrap gap-2">
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/plans/${plan.id}`} />}
                    >
                      {t("open")}
                    </Button>
                    {mine && (
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => copy(plan.id)}
                      >
                        {copying === plan.id ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <CopyIcon data-icon="inline-start" />
                        )}
                        {t("copy")}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
