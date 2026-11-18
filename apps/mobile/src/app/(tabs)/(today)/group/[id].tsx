import { formatInviteCode, type GroupDetailData } from "@workspace/core"
import { Stack, useLocalSearchParams } from "expo-router"
import { Share2, UserRound } from "lucide-react-native"
import { Share, Text } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { GroupPlans } from "@/components/groups/group-plans"
import { QueryState, SignedOutCard } from "@/components/groups/query-state"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { siteUrl } from "@/lib/site"
import { useAccountId, useGroup } from "@/repositories/groups"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * A group: its invitation (for those who manage it), its plans with how far
 * each member is, and its members.
 */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const t = useTranslations("Groups")
  const accountId = useAccountId()
  const group = useGroup(id)
  return (
    <>
      <Stack.Screen options={{ title: group.data?.name ?? t("title") }} />
      <TabScreen>
        {accountId === null ? (
          <SignedOutCard />
        ) : (
          <QueryState query={group}>
            {(detail) => <GroupDetail group={detail} accountId={accountId} />}
          </QueryState>
        )}
      </TabScreen>
    </>
  )
}

function GroupDetail({
  group,
  accountId,
}: {
  group: GroupDetailData
  accountId: string
}) {
  const t = useTranslations("Groups")
  const format = useFormatter()
  return (
    <>
      {group.description ? <Body>{group.description}</Body> : null}
      {group.inviteCode ? (
        <Invite name={group.name} code={group.inviteCode} />
      ) : null}
      <GroupPlans groupId={group.id} role={group.role} accountId={accountId} />
      <Card
        title={t("membersTitle", { count: group.members.length })}
        padded={false}
      >
        {group.members.map((member, index) => (
          <ListRow
            key={member.userId}
            icon={UserRound}
            label={
              member.userId === accountId
                ? `${member.name} ${t("you")}`
                : member.name
            }
            subtitle={`${t(`roles.${member.role}`)} · ${t("joined", {
              date: format.dateTime(new Date(member.joinedAt), {
                dateStyle: "long",
              }),
            })}`}
            last={index === group.members.length - 1}
          />
        ))}
      </Card>
    </>
  )
}

/** The code and the link to send, for those who manage the members. */
function Invite({ name, code }: { name: string; code: string }) {
  const t = useTranslations("Groups.invite")
  const colors = useColors()
  const shown = formatInviteCode(code)
  return (
    <Card title={t("title")}>
      <Body>{t("description")}</Body>
      <Text
        selectable
        style={[typography.h2, { color: colors.foreground, letterSpacing: 2 }]}
      >
        {shown}
      </Text>
      <Button
        title={t("share")}
        icon={Share2}
        variant="outline"
        onPress={() =>
          void Share.share({
            message: `${t("shareText", { name })} ${siteUrl}/join/${code}`,
          })
        }
      />
    </Card>
  )
}
