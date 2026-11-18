import {
  canManageMembers,
  daysBetween,
  getToday,
  type GroupPlanData,
  type GroupRole,
  type IsoDate,
} from "@workspace/core"
import { router } from "expo-router"
import { MessageCircle } from "lucide-react-native"
import { useState } from "react"
import { Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { QueryState } from "@/components/groups/query-state"
import { Body } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { useGroupPlans } from "@/repositories/groups"
import { useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** Members shown at first in a plan; the others behind "Show all". */
const firstMembers = 5

/** The day of a plan to talk about today: the first or last outside it. */
export function dayToDiscuss(plan: GroupPlanData, today: IsoDate): number {
  const day = daysBetween(plan.startDate, today) + 1
  return Math.min(plan.totalDays, Math.max(1, day))
}

/** The plans of a group and how far each member is, as on the website. */
export function GroupPlans({
  groupId,
  role,
  accountId,
}: {
  groupId: string
  role: GroupRole
  accountId: string
}) {
  const t = useTranslations("Groups.plans")
  const plans = useGroupPlans(groupId)
  return (
    <QueryState query={plans} section>
      {(list) =>
        list.length === 0 ? (
          <Card title={t("empty.title")}>
            <Body>
              {t(canManageMembers(role) ? "empty.manager" : "empty.member")}
            </Body>
          </Card>
        ) : (
          list.map((plan) => (
            <GroupPlanCard key={plan.id} plan={plan} accountId={accountId} />
          ))
        )
      }
    </QueryState>
  )
}

function GroupPlanCard({
  plan,
  accountId,
}: {
  plan: GroupPlanData
  accountId: string
}) {
  const t = useTranslations("Groups.plans")
  const tMobile = useTranslations("Mobile.groups")
  const format = useFormatter()
  const colors = useColors()
  const { timeZone } = useProfile()
  const [showAll, setShowAll] = useState(false)
  const day = dayToDiscuss(plan, getToday(timeZone))
  const date = (value: string) =>
    format.dateTime(new Date(`${value}T00:00:00.000Z`), {
      dateStyle: "medium",
      timeZone: "UTC",
    })
  const members = showAll ? plan.members : plan.members.slice(0, firstMembers)
  return (
    <Card title={plan.title}>
      <Body>
        {t("dates", {
          start: date(plan.startDate),
          end: date(plan.endDate),
          days: plan.totalDays,
        })}
      </Body>
      <Text style={[typography.h3, { color: colors.foreground }]}>
        {t("progressTitle")}
      </Text>
      <View style={{ gap: spacing.md }}>
        {members.map((member) => {
          const name =
            member.userId === accountId
              ? `${member.name} ${t("you")}`
              : member.name
          const readings = t("readings", {
            done: member.completedReadings,
            total: plan.totalReadings,
          })
          return (
            <View key={member.userId} style={{ gap: spacing.xs }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: spacing.sm,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    typography.body,
                    { color: colors.foreground, flexShrink: 1 },
                  ]}
                >
                  {name}
                </Text>
                <Text
                  style={[typography.small, { color: colors.mutedForeground }]}
                >
                  {readings}
                </Text>
              </View>
              <ProgressBar
                ratio={
                  plan.totalReadings > 0
                    ? member.completedReadings / plan.totalReadings
                    : 0
                }
                label={`${t("memberProgress", { name: member.name })}, ${readings}`}
              />
            </View>
          )
        })}
      </View>
      {plan.members.length > firstMembers ? (
        <Button
          title={
            showAll
              ? t("showFewer")
              : t("showAll", { count: plan.members.length })
          }
          variant="ghost"
          size="sm"
          onPress={() => setShowAll((current) => !current)}
        />
      ) : null}
      <Button
        title={tMobile("discussion", { day })}
        icon={MessageCircle}
        variant="outline"
        onPress={() =>
          router.push({
            pathname: "/group-day",
            params: {
              plan: plan.id,
              day,
              title: plan.title,
              total: plan.totalDays,
            },
          })
        }
      />
    </Card>
  )
}
