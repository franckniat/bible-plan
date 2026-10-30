import { prayerMinutes } from "@workspace/core"
import { router, Stack } from "expo-router"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { SessionFlow } from "@/components/session/session-flow"
import { Button } from "@/components/ui/button"

/** A time of prayer with a timer, as on the web. */
export default function PrayerTimerScreen() {
  const t = useTranslations("PrayerTimer")
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <SessionFlow
          kind="PRAYER"
          minutes={prayerMinutes}
          defaultMinutes={30}
          after={() => (
            <Button title={t("done.backToJournal")} onPress={() => router.back()} />
          )}
        />
      </TabScreen>
    </>
  )
}
