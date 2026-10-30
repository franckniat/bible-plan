import { maxPrayerTimeMinutes, prayerMinutes } from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { SessionFlow } from "@/components/session/session-flow"
import { Button } from "@/components/ui/button"

/**
 * A prayer time, opened by its notification (bibleplan://prayer-time?minutes=
 * its length): the prayer timer, set to that length.
 */
export default function PrayerTimeScreen() {
  const t = useTranslations("PrayerTimer")
  const { minutes } = useLocalSearchParams<{ minutes?: string }>()
  const length = Number(minutes)
  const valid =
    Number.isInteger(length) && length > 0 && length <= maxPrayerTimeMinutes
  const durations = valid
    ? [...new Set([length, ...prayerMinutes])].sort((a, b) => a - b)
    : prayerMinutes
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <SessionFlow
          kind="PRAYER"
          minutes={durations}
          defaultMinutes={valid ? length : 30}
          after={() => (
            <Button
              title={t("done.backToJournal")}
              onPress={() => router.navigate("/prayer")}
            />
          )}
        />
      </TabScreen>
    </>
  )
}
