import {
  formatInviteCode,
  maxGroupsPerUser,
  normalizeInviteCode,
} from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { CircleAlert, UserPlus, Users } from "lucide-react-native"
import { useEffect } from "react"
import { Text } from "react-native"
import { useTranslations } from "use-intl"

import { QueryState, SignedOutCard } from "@/components/groups/query-state"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Notice } from "@/components/ui/notice"
import { ApiError } from "@/lib/api"
import { haptics } from "@/lib/haptics"
import {
  useAccountId,
  useInvitePreview,
  useJoinGroup,
} from "@/repositories/groups"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** Opens a group, in place of the screen that led to it. */
function openGroup(id: string) {
  router.replace({ pathname: "/group/[id]", params: { id } })
}

/**
 * A group invitation, from bibleplan://join/ABCD2345 or a code typed in the
 * groups: the group's name and size, then "Join the group", as on the
 * website. Somebody already in it goes straight to it.
 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const t = useTranslations()
  const accountId = useAccountId()
  const normalized = normalizeInviteCode(code)
  const preview = useInvitePreview(normalized)
  const member = preview.data?.member ? preview.data.id : null
  useEffect(() => {
    if (member) openGroup(member)
  }, [member])

  return (
    <>
      <Stack.Screen options={{ title: t("Mobile.join.title") }} />
      <TabScreen>
        {!normalized ? (
          <Card title={t("Mobile.join.invalidTitle")}>
            <Body>{t("Mobile.join.invalid", { code })}</Body>
          </Card>
        ) : accountId === null ? (
          <>
            <Body>{t("Mobile.join.signedOut")}</Body>
            <SignedOutCard />
          </>
        ) : preview.error instanceof ApiError &&
          preview.error.code === "notFound" ? (
          <NotFound />
        ) : (
          <QueryState query={preview}>
            {(group) =>
              group.member ? null : (
                <Invitation
                  code={normalized}
                  name={group.name}
                  description={group.description}
                  memberCount={group.memberCount}
                  full={group.full}
                />
              )
            }
          </QueryState>
        )}
      </TabScreen>
    </>
  )
}

function NotFound() {
  const t = useTranslations("Groups.joinPage")
  return (
    <Card title={t("notFound.title")}>
      <Body>{t("notFound.description")}</Body>
      <Button
        title={t("toGroups")}
        icon={Users}
        variant="outline"
        onPress={() => router.replace("/groups")}
      />
    </Card>
  )
}

function Invitation({
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
  const colors = useColors()
  const join = useJoinGroup()
  const error =
    join.error instanceof ApiError
      ? join.error.code
      : join.error && "unexpected"
  return (
    <Card>
      <Body>{t("joinPage.invited")}</Body>
      <Text
        accessibilityRole="header"
        style={[typography.title, { color: colors.foreground }]}
      >
        {name}
      </Text>
      {description ? <Body>{description}</Body> : null}
      <Body>
        {`${t("members", { count: memberCount })} · ${formatInviteCode(code)}`}
      </Body>
      {full || error ? (
        <Notice icon={CircleAlert}>
          {t(`errors.${full ? "full" : errorKey(error)}`, {
            max: maxGroupsPerUser,
          })}
        </Notice>
      ) : null}
      <Button
        title={t("joinPage.join")}
        icon={UserPlus}
        loading={join.isPending}
        disabled={full || join.isPending}
        onPress={() =>
          join.mutate(code, {
            onSuccess: ({ groupId }) => {
              haptics.success()
              openGroup(groupId)
            },
          })
        }
      />
    </Card>
  )
}

/** The key of Groups.errors for what the server said. */
function errorKey(code: string | null) {
  const known = [
    "invalidCode",
    "notFound",
    "forbidden",
    "limit",
    "full",
  ] as const
  return known.find((key) => key === code) ?? "unexpected"
}
