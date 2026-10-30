import { getToday, trophyKeys } from "@workspace/core"
import { router, Stack } from "expo-router"
import { Award, Lock, Trophy } from "lucide-react-native"
import { View } from "react-native"
import { useTranslations } from "use-intl"

import {
  achievementViews,
  type AchievementView,
} from "@/components/achievements/achievement-view"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { useAchievements } from "@/repositories/achievements"
import { useProfile } from "@/repositories/profile"

/** Badges and trophies earned on the phone, and how far the next ones are. */
export default function AchievementsScreen() {
  const t = useTranslations("Achievements")
  const profile = useProfile()
  const { earned, progress } = useAchievements(
    profile.timeZone,
    getToday(profile.timeZone)
  )
  const views = achievementViews(earned, progress, trophyKeys)
  const section = (trophy: boolean) => {
    const items = views.filter((view) => view.trophy === trophy)
    const count = items.filter((view) => view.level > 0).length
    return (
      <Card
        title={t(trophy ? "trophies" : "badges")}
        action={<Body>{t("count", { count })}</Body>}
        padded={false}
      >
        <View>
          {items.map((view, index) => (
            <Row key={view.key} view={view} last={index === items.length - 1} />
          ))}
        </View>
      </Card>
    )
  }
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        {earned.length === 0 ? <Body>{t("empty")}</Body> : null}
        {section(false)}
        {section(true)}
      </TabScreen>
    </>
  )
}

function Row({ view, last }: { view: AchievementView; last: boolean }) {
  const t = useTranslations("Achievements")
  return (
    <ListRow
      icon={view.level === 0 ? Lock : view.trophy ? Trophy : Award}
      label={t(`items.${view.key}.name`)}
      subtitle={
        view.next
          ? `${view.level === 0 ? `${t("locked")} · ` : ""}${t("progress", view.next)}`
          : t("complete")
      }
      // Locked: the lock says it, the name keeps the room.
      value={
        view.level === 0
          ? undefined
          : view.trophy
            ? t("levels.trophy")
            : t(`levels.${view.level as 1 | 2 | 3}`)
      }
      onPress={() =>
        router.push({
          pathname: "/achievement/[key]",
          params: { key: view.key },
        })
      }
      last={last}
    />
  )
}
