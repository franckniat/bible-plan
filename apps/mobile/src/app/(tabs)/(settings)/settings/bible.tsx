import { getBibleVersion } from "@workspace/bible-data"
import { Stack } from "expo-router"
import { Trash2 } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { removeVersion } from "@/bible/downloads"
import { readableVersions, versionName } from "@/bible/versions"
import { ChoiceList } from "@/components/choice-list"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { confirm } from "@/lib/confirm"
import { usePreferences } from "@/lib/preferences"
import { bibleVersionOf, setProfile, useProfile } from "@/repositories/profile"
import { useColors } from "@/theme/use-colors"

/** The version read in the app, and the versions downloaded. */
export default function BibleSettingScreen() {
  const t = useTranslations()
  const locale = useLocale()
  const colors = useColors()
  const profile = useProfile()
  const { downloaded } = usePreferences()
  const readable = readableVersions(downloaded)
  const removable = readable.filter((id) => downloaded.includes(id))

  return (
    <>
      <Stack.Screen options={{ title: t("Settings.bible.title") }} />
      <TabScreen>
        <Body>{t("Settings.bible.description")}</Body>
        <ChoiceList
          options={readable.map((id) => ({
            value: id,
            label: versionName(id),
          }))}
          value={bibleVersionOf(profile.bibleVersion, locale)}
          onChange={(bibleVersion) => setProfile({ bibleVersion })}
        />

        {removable.length > 0 ? (
          <Card title={t("Mobile.versions.downloaded")} padded={false}>
            <View>
              {removable.map((id, index) => {
                const name = versionName(id)
                return (
                  <ListRow
                    key={id}
                    label={name}
                    subtitle={getBibleVersion(id).abbreviation}
                    trailing={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Mobile.versions.remove", {
                          version: name,
                        })}
                        hitSlop={12}
                        onPress={async () => {
                          const sure = await confirm({
                            title: t("Mobile.versions.removeTitle", {
                              version: name,
                            }),
                            message: t("Mobile.versions.removeMessage"),
                            confirmLabel: t("Mobile.versions.removeConfirm"),
                            cancelLabel: t("Mobile.versions.cancel"),
                          })
                          if (sure) await removeVersion(id)
                        }}
                      >
                        <Trash2 size={20} color={colors.destructive} />
                      </Pressable>
                    }
                    last={index === removable.length - 1}
                  />
                )
              })}
            </View>
          </Card>
        ) : null}
      </TabScreen>
    </>
  )
}
