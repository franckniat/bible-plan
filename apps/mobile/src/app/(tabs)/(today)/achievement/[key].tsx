import { getToday, trophyKeys } from "@workspace/core"
import { Stack, useLocalSearchParams } from "expo-router"
import { Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { achievementViews } from "@/components/achievements/achievement-view"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { useAchievements } from "@/repositories/achievements"
import { useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** A badge or a trophy: what it asks, its levels, and the way to the next. */
export default function AchievementScreen() {
  const t = useTranslations("Achievements")
  const format = useFormatter()
  const colors = useColors()
  const profile = useProfile()
  const { key } = useLocalSearchParams<{ key: string }>()
  const { earned, progress } = useAchievements(
    profile.timeZone,
    getToday(profile.timeZone)
  )
  const view = achievementViews(earned, progress, trophyKeys).find(
    (item) => item.key === key
  )
  if (!view) return <TabScreen />
  const name = t(`items.${view.key}.name`)
  const date = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00.000Z`), {
      dateStyle: "long",
      timeZone: "UTC",
    })
  const levelName = (level: number) =>
    view.trophy ? t("levels.trophy") : t(`levels.${level as 1 | 2 | 3}`)

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <TabScreen>
        <Card title={name}>
          <Body>
            {t(`items.${view.key}.description`, { count: view.count })}
          </Body>
          {view.next ? (
            <View style={{ gap: spacing.xs }}>
              <ProgressBar
                ratio={view.next.value / view.next.target}
                label={t("progress", view.next)}
              />
              <Body>{t("progress", view.next)}</Body>
            </View>
          ) : (
            <Body>{t("complete")}</Body>
          )}
        </Card>
        <Card padded={false}>
          {Array.from({ length: view.levels }, (_, index) => index + 1).map(
            (level) => (
              <View
                key={level}
                accessible
                accessibilityLabel={t("levelAria", {
                  name,
                  level: levelName(level),
                })}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderTopWidth: level === 1 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={[typography.body, { color: colors.foreground }]}>
                  {levelName(level)}
                </Text>
                <Text
                  style={[typography.small, { color: colors.mutedForeground }]}
                >
                  {view.earned[level]
                    ? t("earnedOn", { date: date(view.earned[level]) })
                    : t("locked")}
                </Text>
              </View>
            )
          )}
        </Card>
      </TabScreen>
    </>
  )
}
