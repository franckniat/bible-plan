import { readingSpeeds } from "@workspace/core"
import { router } from "expo-router"
import { BookOpen, Clock, Gauge, Languages, Shapes } from "lucide-react-native"
import { View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import {
  bibleVersionNames,
  bibleVersionOf,
  useProfile,
} from "@/repositories/profile"

/** The settings of the local profile, without an account. */
export default function SettingsScreen() {
  const t = useTranslations()
  const locale = useLocale()
  const profile = useProfile()
  const language = t("LanguageSwitcher.locale", { locale })

  return (
    <TabScreen>
      <Card title={t("Mobile.settings.reading")} padded={false}>
        <View>
          <ListRow
            icon={BookOpen}
            label={t("Settings.bible.title")}
            value={
              bibleVersionNames[bibleVersionOf(profile.bibleVersion, locale)]
            }
            onPress={() => router.push("/settings/bible")}
          />
          <ListRow
            icon={Gauge}
            label={t("Settings.fields.readingSpeed")}
            value={t(`Settings.readingSpeeds.${profile.readingSpeed}.label`, {
              wpm: readingSpeeds[profile.readingSpeed],
            })}
            onPress={() => router.push("/settings/pace")}
            last
          />
        </View>
      </Card>

      <Card title={t("Mobile.settings.app")} padded={false}>
        <View>
          <ListRow
            icon={Languages}
            label={t("Settings.fields.locale")}
            value={
              profile.locale
                ? language
                : t("Mobile.settings.phoneLanguage", { language })
            }
            onPress={() => router.push("/settings/language")}
          />
          <ListRow
            icon={Clock}
            label={t("Settings.fields.timezone")}
            subtitle={t("Settings.fields.timezoneHint")}
            value={profile.timeZone.replaceAll("_", " ")}
            last
          />
        </View>
      </Card>

      {__DEV__ ? (
        <Card title={t("Mobile.settings.developer")} padded={false}>
          <ListRow
            icon={Shapes}
            label={t("Mobile.settings.uiKit")}
            onPress={() => router.push("/ui-kit")}
            last
          />
        </Card>
      ) : null}
    </TabScreen>
  )
}
