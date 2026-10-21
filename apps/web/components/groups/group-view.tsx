"use client"

import {
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  LogOutIcon,
  RefreshCwIcon,
  Share2Icon,
  Trash2Icon,
  UserMinusIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useSyncExternalStore, useTransition } from "react"

import {
  canChangeRoles,
  canDeleteGroup,
  canManageMembers,
  canRemoveMember,
  formatInviteCode,
  type GroupRole,
} from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { useRouter } from "@/i18n/navigation"
import {
  deleteGroupAction,
  leaveGroupAction,
  regenerateInviteCodeAction,
  removeMemberAction,
  setMemberRoleAction,
  type GroupActionError,
} from "@/server/actions/groups"

export type GroupMemberRow = {
  userId: string
  name: string
  role: GroupRole
  /** "12 oct. 2026". */
  joined: string
}

export type GroupViewData = {
  id: string
  name: string
  description: string | null
  inviteCode: string | null
  role: GroupRole
  members: GroupMemberRow[]
}

export function GroupView({
  group,
  currentUserId,
}: {
  group: GroupViewData
  currentUserId: string
}) {
  const t = useTranslations("Groups")
  const locale = useLocale()
  const router = useRouter()
  // The address of the site is only known in the browser ("" while rendering
  // on the server).
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  )
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<GroupActionError | null>(null)
  const [pending, startTransition] = useTransition()
  const manager = canManageMembers(group.role)
  const owner = group.role === "OWNER"

  const link = group.inviteCode
    ? `${origin}/${locale}/join/${group.inviteCode}`
    : ""

  function run(
    action: () => Promise<{ ok: true } | { error: GroupActionError }>,
    then?: () => void
  ) {
    setError(null)
    startTransition(async () => {
      const result = await action().catch(
        () => ({ error: "unexpected" }) as const
      )
      if ("error" in result) return setError(result.error)
      if (then) then()
      else router.refresh()
    })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard refused (insecure page): the link is selectable anyway.
    }
  }

  const roleItems = [
    { value: "ADMIN", label: t("roles.ADMIN") },
    { value: "MEMBER", label: t("roles.MEMBER") },
  ]

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{t(`errors.${error}`, { max: 0 })}</AlertDescription>
        </Alert>
      )}

      {manager && group.inviteCode && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              {t("invite.title")}
            </CardTitle>
            <CardDescription>{t("invite.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <InputGroup>
              <InputGroupInput
                readOnly
                value={link}
                aria-label={t("invite.link")}
                onFocus={(event) => event.currentTarget.select()}
              />
              <InputGroupAddon align="inline-end">
                <Button size="sm" variant="ghost" onClick={copyLink}>
                  {copied ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <CopyIcon data-icon="inline-start" />
                  )}
                  {copied ? t("invite.copied") : t("invite.copy")}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            <p className="text-sm text-muted-foreground">
              {t("invite.code")}{" "}
              <Badge variant="outline" className="font-mono text-sm">
                {formatInviteCode(group.inviteCode)}
              </Badge>
            </p>
            <div className="flex flex-wrap gap-2">
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigator
                      .share({
                        title: group.name,
                        text: t("invite.shareText", { name: group.name }),
                        url: link,
                      })
                      .catch(() => {})
                  }
                >
                  <Share2Icon data-icon="inline-start" />
                  {t("invite.share")}
                </Button>
              )}
              <ConfirmDialog
                trigger={
                  <Button variant="outline" disabled={pending}>
                    <RefreshCwIcon data-icon="inline-start" />
                    {t("invite.regenerate")}
                  </Button>
                }
                title={t("invite.regenerateDialog.title")}
                description={t("invite.regenerateDialog.description")}
                confirmLabel={t("invite.regenerateDialog.confirm")}
                cancelLabel={t("cancel")}
                destructive={false}
                onConfirm={() =>
                  run(() => regenerateInviteCodeAction(group.id))
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {t("membersTitle", { count: group.members.length })}
        </h2>
        <Card>
          <CardContent>
            <ul className="flex flex-col">
              {group.members.map((member, index) => {
                const me = member.userId === currentUserId
                return (
                  <li key={member.userId}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          {member.name}
                          {me && (
                            <span className="text-sm font-normal text-muted-foreground">
                              {t("you")}
                            </span>
                          )}
                          <Badge
                            variant={
                              member.role === "MEMBER" ? "outline" : "secondary"
                            }
                          >
                            {t(`roles.${member.role}`)}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("joined", { date: member.joined })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canChangeRoles(group.role) &&
                          !me &&
                          member.role !== "OWNER" && (
                            <>
                              <Select
                                items={roleItems}
                                value={member.role}
                                disabled={pending}
                                onValueChange={(role) =>
                                  role &&
                                  role !== member.role &&
                                  run(() =>
                                    setMemberRoleAction(
                                      group.id,
                                      member.userId,
                                      role
                                    )
                                  )
                                }
                              >
                                <SelectTrigger
                                  size="sm"
                                  aria-label={t("changeRole", {
                                    name: member.name,
                                  })}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {roleItems.map((item) => (
                                      <SelectItem
                                        key={item.value}
                                        value={item.value}
                                      >
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                  >
                                    {t("handOver.button")}
                                  </Button>
                                }
                                title={t("handOver.title", {
                                  name: member.name,
                                })}
                                description={t("handOver.description")}
                                confirmLabel={t("handOver.confirm")}
                                cancelLabel={t("cancel")}
                                destructive={false}
                                onConfirm={() =>
                                  run(() =>
                                    setMemberRoleAction(
                                      group.id,
                                      member.userId,
                                      "OWNER"
                                    )
                                  )
                                }
                              />
                            </>
                          )}
                        {!me && canRemoveMember(group.role, member.role) && (
                          <ConfirmDialog
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={pending}
                                aria-label={t("remove.label", {
                                  name: member.name,
                                })}
                              >
                                <UserMinusIcon data-icon="inline-start" />
                                {t("remove.button")}
                              </Button>
                            }
                            title={t("remove.title", { name: member.name })}
                            description={t("remove.description")}
                            confirmLabel={t("remove.confirm")}
                            cancelLabel={t("cancel")}
                            onConfirm={() =>
                              run(() =>
                                removeMemberAction(group.id, member.userId)
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <Separator />
        <div className="flex flex-wrap gap-2">
          {!owner && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={pending}>
                  <LogOutIcon data-icon="inline-start" />
                  {t("leave.button")}
                </Button>
              }
              title={t("leave.title", { name: group.name })}
              description={t("leave.description")}
              confirmLabel={t("leave.confirm")}
              cancelLabel={t("cancel")}
              onConfirm={() =>
                run(
                  () => leaveGroupAction(group.id),
                  () => router.push("/groups")
                )
              }
            />
          )}
          {canDeleteGroup(group.role) && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={pending}>
                  <Trash2Icon data-icon="inline-start" />
                  {t("delete.button")}
                </Button>
              }
              title={t("delete.title", { name: group.name })}
              description={t("delete.description")}
              confirmLabel={t("delete.confirm")}
              cancelLabel={t("cancel")}
              onConfirm={() =>
                run(
                  () => deleteGroupAction(group.id),
                  () => router.push("/groups")
                )
              }
            />
          )}
        </div>
        {owner && group.members.length > 1 && (
          <p className="text-sm text-muted-foreground">{t("leave.ownerHint")}</p>
        )}
      </section>
    </div>
  )
}
