import { router, Stack } from "expo-router"
import { Users } from "lucide-react-native"
import { useTranslations } from "use-intl"

import { JoinByCode } from "@/components/groups/join-by-code"
import { QueryState, SignedOutCard } from "@/components/groups/query-state"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { useAccountId, useGroups } from "@/repositories/groups"

/** The groups of the person signed in, as on the website. */
export default function GroupsScreen() {
  const t = useTranslations("Groups")
  const accountId = useAccountId()
  const groups = useGroups()
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        {accountId === null ? (
          <SignedOutCard />
        ) : (
          <QueryState query={groups}>
            {(list) =>
              list.length === 0 ? (
                <Card title={t("empty.title")}>
                  <Body>{t("empty.description")}</Body>
                </Card>
              ) : (
                <Card padded={false}>
                  {list.map((group, index) => (
                    <ListRow
                      key={group.id}
                      icon={Users}
                      label={group.name}
                      subtitle={`${t(`roles.${group.role}`)} · ${t("members", {
                        count: group.memberCount,
                      })}`}
                      onPress={() =>
                        router.push({
                          pathname: "/group/[id]",
                          params: { id: group.id },
                        })
                      }
                      last={index === list.length - 1}
                    />
                  ))}
                </Card>
              )
            }
          </QueryState>
        )}
        {accountId === null ? null : <JoinByCode />}
      </TabScreen>
    </>
  )
}
