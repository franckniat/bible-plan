"use client"

import {
  BookOpenIcon,
  CircleAlertIcon,
  HandHeartIcon,
  SparklesIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import type { Locale } from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Spinner } from "@workspace/ui/components/spinner"

import { Link } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import { labelOfSlug } from "@/lib/passage-input"
import { togglePrayingAction } from "@/server/actions/groups"
import type { GroupPrayer } from "@/server/services/group-prayers"

/**
 * The prayer requests the members shared with the group, each with the number
 * of people praying for it and a button to say "I am praying for you".
 */
export function GroupPrayers({
  prayers,
  currentUserId,
}: {
  prayers: GroupPrayer[]
  currentUserId: string
}) {
  const t = useTranslations("Groups.prayers")
  const tPrayer = useTranslations("Prayer")
  const locale = useLocale() as Locale
  // What the person just did, shown before the page is refreshed.
  const [overrides, setOverrides] = useState<
    Record<string, { praying: boolean; count: number }>
  >({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [, startTransition] = useTransition()

  function toggle(id: string) {
    setError(false)
    setBusy(id)
    startTransition(async () => {
      const result = await togglePrayingAction(id).catch(
        () => ({ error: "unexpected" }) as const
      )
      setBusy(null)
      if ("error" in result) return setError(true)
      setOverrides((current) => ({
        ...current,
        [id]: { praying: result.praying, count: result.supportCount },
      }))
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{t("error")}</AlertDescription>
        </Alert>
      )}

      {prayers.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HandHeartIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {prayers.map((prayer) => {
            const mine = prayer.authorId === currentUserId
            const praying = overrides[prayer.id]?.praying ?? prayer.supportedByMe
            const count = overrides[prayer.id]?.count ?? prayer.supportCount
            const answered = prayer.status === "ANSWERED"
            return (
              <li key={prayer.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-lg">
                      {prayer.title}
                      <Badge variant="secondary">
                        {tPrayer(`categories.${prayer.category}`)}
                      </Badge>
                      {answered && (
                        <Badge>
                          <SparklesIcon data-icon="inline-start" />
                          {t("answered")}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {mine
                        ? t("byYou")
                        : t("by", { name: prayer.authorName })}
                      {prayer.answeredOn &&
                        ` · ${t("answeredOn", {
                          date: formatIsoDate(prayer.answeredOn, locale),
                        })}`}
                    </p>
                  </CardHeader>
                  {(prayer.details || prayer.passages.length > 0) && (
                    <CardContent className="flex flex-col gap-3">
                      {prayer.details && (
                        <p className="whitespace-pre-line text-muted-foreground">
                          {prayer.details}
                        </p>
                      )}
                      {prayer.passages.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                          {prayer.passages.map((slug) => (
                            <li key={slug}>
                              <Badge
                                variant="outline"
                                className="h-6 px-2.5 text-sm"
                                render={<Link href={`/read/${slug}`} />}
                              >
                                <BookOpenIcon data-icon="inline-start" />
                                {labelOfSlug(slug, locale)}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  )}
                  <CardFooter className="flex-wrap items-center gap-3">
                    {!mine && !answered && (
                      <Button
                        variant={praying ? "default" : "outline"}
                        aria-pressed={praying}
                        disabled={busy === prayer.id}
                        onClick={() => toggle(prayer.id)}
                      >
                        {busy === prayer.id ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <HandHeartIcon data-icon="inline-start" />
                        )}
                        {praying ? t("praying") : t("pray")}
                      </Button>
                    )}
                    <span
                      aria-live="polite"
                      className="text-sm text-muted-foreground"
                    >
                      {t("count", { count })}
                    </span>
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
