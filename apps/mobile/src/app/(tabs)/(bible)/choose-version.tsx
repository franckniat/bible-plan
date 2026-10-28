import { getBibleVersion } from "@workspace/bible-data"
import { router, Stack } from "expo-router"
import { useLocale, useTranslations } from "use-intl"

import { ChoiceList } from "@/components/choice-list"
import { TabScreen } from "@/components/screen"
import {
  bibleVersionIds,
  bibleVersionNames,
  bibleVersionOf,
  setProfile,
  useProfile,
} from "@/repositories/profile"

/** The versions on the phone, opened from the reader's header. */
export default function ChooseVersionScreen() {
  const t = useTranslations("Reader")
  const locale = useLocale()
  const profile = useProfile()
  return (
    <>
      <Stack.Screen
        options={{ title: t("version"), presentation: "formSheet" }}
      />
      <TabScreen>
        <ChoiceList
          options={bibleVersionIds.map((id) => ({
            value: id,
            label: bibleVersionNames[id],
            subtitle: getBibleVersion(id).abbreviation,
          }))}
          value={bibleVersionOf(profile.bibleVersion, locale)}
          onChange={(bibleVersion) => {
            setProfile({ bibleVersion })
            router.back()
          }}
        />
      </TabScreen>
    </>
  )
}
