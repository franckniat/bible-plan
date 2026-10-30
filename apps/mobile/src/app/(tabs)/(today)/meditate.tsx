import { meditationMinutes } from "@workspace/core"
import { Stack } from "expo-router"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { SessionFlow } from "@/components/session/session-flow"

/** A time of meditation with a timer, as on the web. */
export default function MeditateScreen() {
  const t = useTranslations("Meditate")
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <SessionFlow
          kind="MEDITATION"
          minutes={meditationMinutes}
          defaultMinutes={10}
        />
      </TabScreen>
    </>
  )
}
