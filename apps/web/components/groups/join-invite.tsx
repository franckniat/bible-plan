"use client"

import { CircleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Spinner } from "@workspace/ui/components/spinner"

import { useRouter } from "@/i18n/navigation"
import { joinGroupAction, type GroupActionError } from "@/server/actions/groups"

/** The group an invitation is for, and the button to join it. */
export function JoinInvite({
  code,
  name,
  description,
  memberCount,
  full,
}: {
  code: string
  name: string
  description: string | null
  memberCount: number
  full: boolean
}) {
  const t = useTranslations("Groups")
  const router = useRouter()
  const [error, setError] = useState<GroupActionError | null>(null)
  const [pending, startTransition] = useTransition()

  function join() {
    setError(null)
    startTransition(async () => {
      const result = await joinGroupAction(code).catch(
        () => ({ error: "unexpected" }) as const
      )
      if ("error" in result) return setError(result.error)
      router.push(`/groups/${result.groupId}`)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>
            {t(`errors.${error}`, { max: 0 })}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardDescription>{t("joinPage.invited")}</CardDescription>
          <CardTitle className="font-heading text-2xl">{name}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("members", { count: memberCount })}
          </p>
          <Button size="lg" disabled={pending || full} onClick={join}>
            {pending && <Spinner data-icon="inline-start" />}
            {t("joinPage.join")}
          </Button>
          {full && (
            <p role="alert" className="text-sm text-destructive">
              {t("errors.full")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
