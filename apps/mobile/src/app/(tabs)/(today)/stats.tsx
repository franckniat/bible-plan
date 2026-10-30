import { addDays, buildHeatmap, getToday } from "@workspace/core"
import { Stack } from "expo-router"
import { Flame } from "lucide-react-native"
import { Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { useActivity } from "@/repositories/activity"
import { useProfile } from "@/repositories/profile"
import { brand } from "@/theme/colors"
import { fontFamily } from "@/theme/fonts"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** Weeks of the activity map: about six months, as on the web. */
const weeks = 26

/** Gold, fuller as the day was fuller (level 1 to 4). */
const levelOpacity = [0, 0.3, 0.5, 0.75, 1]

/** Streaks, totals and the map of the last six months, kept on the phone. */
export default function StatsScreen() {
  const t = useTranslations("Stats")
  const format = useFormatter()
  const colors = useColors()
  const profile = useProfile()
  const today = getToday(profile.timeZone)
  const { days, streak, totals } = useActivity(today, profile.timeZone)
  const byDay = new Map(days.map((day) => [day.day, day]))
  const heatmap = buildHeatmap(byDay, today, weeks)
  const since = addDays(today, -29)
  const last30 = days.filter((day) => day.day >= since).length
  const minutes = (seconds: number) =>
    t("totals.minutes", { count: Math.round(seconds / 60) })
  const dayLabel = (date: string) => {
    const day = byDay.get(date)
    const name = format.dateTime(new Date(`${date}T00:00:00.000Z`), {
      dateStyle: "medium",
      timeZone: "UTC",
    })
    return day
      ? `${name} · ${t("heatmap.day", {
          readings: day.readings,
          prayers: day.prayers,
          minutes: Math.round((day.meditationSeconds + day.prayerSeconds) / 60),
        })}`
      : `${name} · ${t("heatmap.nothing")}`
  }

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <Flame size={36} color={colors.accent} />
            <Text
              style={{
                fontFamily: fontFamily.heading,
                fontSize: 28,
                lineHeight: 36,
                color: colors.foreground,
                flexShrink: 1,
              }}
            >
              {streak.current > 0
                ? t("streak.days", { count: streak.current })
                : t("streak.none")}
            </Text>
          </View>
          <Body>
            {streak.activeToday
              ? t("streak.todayDone")
              : streak.current > 0
                ? t("streak.keepGoing")
                : t("streak.start")}
          </Body>
        </Card>

        <Card padded={false}>
          <View>
            <ListRow
              label={t("totals.longest")}
              value={t("streak.days", { count: streak.longest })}
            />
            <ListRow
              label={t("totals.activeDays")}
              value={`${totals.activeDays}`}
            />
            <ListRow
              label={t("totals.last30")}
              value={t("totals.daysCount", { count: last30 })}
            />
            <ListRow
              label={t("totals.readings")}
              value={`${totals.readings}`}
            />
            <ListRow label={t("totals.prayers")} value={`${totals.prayers}`} />
            <ListRow
              label={t("totals.meditation")}
              value={minutes(totals.meditationSeconds)}
            />
            <ListRow
              label={t("totals.prayerTime")}
              value={minutes(totals.prayerSeconds)}
              last
            />
          </View>
        </Card>

        <Card title={t("heatmap.title")}>
          <View
            accessibilityLabel={t("heatmap.label")}
            style={{ flexDirection: "row", gap: 2 }}
          >
            {heatmap.map((week) => (
              <View key={week[0]!.date} style={{ flex: 1, gap: 2 }}>
                {week.map((cell) => (
                  <View
                    key={cell.date}
                    accessible={!cell.future}
                    accessibilityLabel={
                      cell.future ? undefined : dayLabel(cell.date)
                    }
                    style={{
                      aspectRatio: 1,
                      borderRadius: 2,
                      backgroundColor:
                        cell.level === 0 ? colors.muted : brand.gold,
                      opacity: cell.future
                        ? 0
                        : cell.level === 0
                          ? 1
                          : levelOpacity[cell.level],
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            {t("heatmap.legend")}
          </Text>
        </Card>
      </TabScreen>
    </>
  )
}
