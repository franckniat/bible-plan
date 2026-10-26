import { readingSpeeds, type ReadingSpeed } from "@workspace/core"
import { Stack } from "expo-router"
import { useTranslations } from "use-intl"

import { ChoiceList } from "@/components/choice-list"
import { Body, TabScreen } from "@/components/screen"
import { setProfile, useProfile } from "@/repositories/profile"

/** How fast the person reads, to size the plans made from a time a day. */
export default function PaceSettingScreen() {
  const t = useTranslations("Settings")
  const profile = useProfile()
  return (
    <>
      <Stack.Screen options={{ title: t("fields.readingSpeed") }} />
      <TabScreen>
        <Body>{t("fields.readingSpeedHint")}</Body>
        <ChoiceList
          options={(Object.keys(readingSpeeds) as ReadingSpeed[]).map(
            (speed) => ({
              value: speed,
              label: t(`readingSpeeds.${speed}.label`),
              subtitle: t(`readingSpeeds.${speed}.description`, {
                wpm: readingSpeeds[speed],
              }),
            })
          )}
          value={profile.readingSpeed}
          onChange={(readingSpeed) => setProfile({ readingSpeed })}
        />
      </TabScreen>
    </>
  )
}
