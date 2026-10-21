"use client"

import { CircleAlertIcon, KeyRoundIcon, PlusIcon, UsersIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import {
  maxGroupDescriptionLength,
  maxGroupNameLength,
  maxGroupsPerUser,
  type GroupRole,
} from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import {
  createGroupAction,
  joinGroupAction,
  type GroupActionError,
} from "@/server/actions/groups"

export type GroupSummaryView = {
  id: string
  name: string
  description: string | null
  role: GroupRole
  memberCount: number
}

/** The groups of the person, with the forms to create one or to join one. */
export function GroupsManager({ groups }: { groups: GroupSummaryView[] }) {
  const t = useTranslations("Groups")
  const router = useRouter()
  const id = useId()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<GroupActionError | null>(null)
  const [pending, startTransition] = useTransition()
  const atLimit = groups.length >= maxGroupsPerUser

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await createGroupAction({ name, description }).catch(
        () => ({ error: "unexpected" }) as const
      )
      if ("error" in result) return setError(result.error)
      router.push(`/groups/${result.id}`)
    })
  }

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
    <div className="flex flex-col gap-8">
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>
            {t(`errors.${error}`, { max: maxGroupsPerUser })}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              {t("join.title")}
            </CardTitle>
            <CardDescription>{t("join.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (code.trim() !== "") join()
              }}
            >
              <Field>
                <FieldLabel htmlFor={`${id}-code`} className="sr-only">
                  {t("join.label")}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <KeyRoundIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={`${id}-code`}
                    value={code}
                    placeholder={t("join.placeholder")}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setCode(event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pending || code.trim() === ""}
                    >
                      {pending && <Spinner data-icon="inline-start" />}
                      {t("join.submit")}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              {t("create.title")}
            </CardTitle>
            <CardDescription>{t("create.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {creating ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (name.trim() !== "") create()
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${id}-name`}>
                      {t("create.name")}
                    </FieldLabel>
                    <Input
                      id={`${id}-name`}
                      value={name}
                      maxLength={maxGroupNameLength}
                      placeholder={t("create.namePlaceholder")}
                      onChange={(event) => setName(event.target.value)}
                      autoFocus
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-description`}>
                      {t("create.descriptionLabel")}
                    </FieldLabel>
                    <Textarea
                      id={`${id}-description`}
                      value={description}
                      maxLength={maxGroupDescriptionLength}
                      onChange={(event) => setDescription(event.target.value)}
                      className="min-h-20"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={pending || name.trim() === ""}
                    >
                      {pending && <Spinner data-icon="inline-start" />}
                      {t("create.submit")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCreating(false)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            ) : (
              <Button disabled={atLimit} onClick={() => setCreating(true)}>
                <PlusIcon data-icon="inline-start" />
                {t("create.open")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-xl">
                    <Link
                      href={`/groups/${group.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {group.name}
                    </Link>
                    <Badge variant="secondary">{t(`roles.${group.role}`)}</Badge>
                  </CardTitle>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="text-sm text-muted-foreground">
                  {t("members", { count: group.memberCount })}
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
