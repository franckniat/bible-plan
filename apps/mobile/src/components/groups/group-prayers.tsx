import type { GroupPrayerData } from "@workspace/core"
import { CircleAlert, HandHeart } from "lucide-react-native"
import { Text } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { QueryState } from "@/components/groups/query-state"
import { Body } from "@/components/screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Notice } from "@/components/ui/notice"
import { haptics } from "@/lib/haptics"
import { useGroupPrayers, useTogglePraying } from "@/repositories/groups"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * The prayer requests the members shared with the group, and "I am praying
 * for you" on each, as on the website.
 */
export function GroupPrayers({
  groupId,
  accountId,
}: {
  groupId: string
  accountId: string
}) {
  const t = useTranslations("Groups.prayers")
  const tMobile = useTranslations("Mobile.groups")
  const prayers = useGroupPrayers(groupId)
  const toggle = useTogglePraying(groupId)
  const colors = useColors()
  return (
    <QueryState query={prayers} section>
      {(list) => (
        <>
          <Text
            accessibilityRole="header"
            style={[typography.h2, { color: colors.foreground }]}
          >
            {t("title")}
          </Text>
          <Body>{t("description")}</Body>
          {toggle.isError ? (
            <Notice icon={CircleAlert}>{t("error")}</Notice>
          ) : null}
          {list.length === 0 ? (
            <Card title={t("empty.title")}>
              <Body>{tMobile("prayersEmpty")}</Body>
            </Card>
          ) : (
            list.map((prayer) => (
              <GroupPrayerCard
                key={prayer.id}
                prayer={prayer}
                mine={prayer.authorId === accountId}
                pending={toggle.isPending && toggle.variables === prayer.id}
                onPray={() => {
                  haptics.tap()
                  toggle.mutate(prayer.id)
                }}
              />
            ))
          )}
        </>
      )}
    </QueryState>
  )
}

function GroupPrayerCard({
  prayer,
  mine,
  pending,
  onPray,
}: {
  prayer: GroupPrayerData
  mine: boolean
  pending: boolean
  onPray: () => void
}) {
  const t = useTranslations("Groups.prayers")
  const tPrayer = useTranslations("Prayer")
  const format = useFormatter()
  const colors = useColors()
  const muted = [typography.small, { color: colors.mutedForeground }]
  const answered = prayer.status === "ANSWERED"
  return (
    <Card
      title={prayer.title}
      action={<Badge label={tPrayer(`categories.${prayer.category}`)} />}
    >
      {prayer.details ? (
        <Text style={[typography.body, { color: colors.foreground }]}>
          {prayer.details}
        </Text>
      ) : null}
      {prayer.passages.length > 0 ? (
        <Text style={muted}>{prayer.passages.join(" · ")}</Text>
      ) : null}
      <Text style={muted}>
        {mine ? t("byYou") : t("by", { name: prayer.authorName })}
        {answered && prayer.answeredOn
          ? ` · ${t("answeredOn", {
              date: format.dateTime(
                new Date(`${prayer.answeredOn}T00:00:00.000Z`),
                { dateStyle: "long", timeZone: "UTC" }
              ),
            })}`
          : ""}
      </Text>
      <Text style={muted}>{t("count", { count: prayer.supportCount })}</Text>
      {answered ? (
        <Badge label={t("answered")} variant="accent" />
      ) : mine ? null : (
        <Button
          title={prayer.supportedByMe ? t("praying") : t("pray")}
          icon={HandHeart}
          variant={prayer.supportedByMe ? "secondary" : "outline"}
          size="sm"
          loading={pending}
          accessibilityState={{ selected: prayer.supportedByMe }}
          onPress={onPray}
        />
      )}
    </Card>
  )
}
