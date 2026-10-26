import { Stack } from "expo-router"
import { useLocale, useTranslations } from "use-intl"

import { ChoiceList } from "@/components/choice-list"
import { Body, TabScreen } from "@/components/screen"
import {
  bibleVersionIds,
  bibleVersionNames,
  bibleVersionOf,
  setProfile,
  useProfile,
} from "@/repositories/profile"

/** The version read in the app. */
export default function BibleSettingScreen() {
  const t = useTranslations("Settings.bible")
  const locale = useLocale()
  const profile = useProfile()
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <ChoiceList
          options={bibleVersionIds.map((id) => ({
            value: id,
            label: bibleVersionNames[id],
          }))}
          value={bibleVersionOf(profile.bibleVersion, locale)}
          onChange={(bibleVersion) => setProfile({ bibleVersion })}
        />
      </TabScreen>
    </>
  )
}
