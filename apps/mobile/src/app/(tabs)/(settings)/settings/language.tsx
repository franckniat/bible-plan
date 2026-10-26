import { locales, type Locale } from "@workspace/core"
import { Stack } from "expo-router"
import { useTranslations } from "use-intl"

import { ChoiceList } from "@/components/choice-list"
import { TabScreen } from "@/components/screen"
import { phoneLocale } from "@/i18n/locale"
import { setProfile, useProfile } from "@/repositories/profile"

/** The app's language: the phone's (by default) or one chosen. */
export default function LanguageSettingScreen() {
  const t = useTranslations()
  const profile = useProfile()
  const name = (locale: Locale) => t("LanguageSwitcher.locale", { locale })
  return (
    <>
      <Stack.Screen options={{ title: t("Settings.fields.locale") }} />
      <TabScreen>
        <ChoiceList
          options={[
            {
              value: "phone",
              label: t("Mobile.settings.phoneLanguage", {
                language: name(phoneLocale()),
              }),
            },
            ...locales.map((locale) => ({
              value: locale,
              label: name(locale),
            })),
          ]}
          value={profile.locale ?? "phone"}
          onChange={(value) =>
            setProfile({ locale: value === "phone" ? null : value })
          }
        />
      </TabScreen>
    </>
  )
}
