import { getBibleVersion, type BibleVersionId } from "@workspace/bible-data"
import { router, Stack } from "expo-router"
import { CircleAlert, Download } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { downloadVersion, useDownloading } from "@/bible/downloads"
import {
  downloadableVersions,
  readableVersions,
  versionName,
} from "@/bible/versions"
import { ChoiceList } from "@/components/choice-list"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { Notice } from "@/components/ui/notice"
import { usePreferences } from "@/lib/preferences"
import { bibleVersionOf, setProfile, useProfile } from "@/repositories/profile"
import { useColors } from "@/theme/use-colors"

/**
 * The versions on the phone, opened from the reader's header, and the
 * others to download (public domain, from the website).
 */
export default function ChooseVersionScreen() {
  const t = useTranslations()
  const locale = useLocale()
  const colors = useColors()
  const profile = useProfile()
  const { downloaded } = usePreferences()
  const downloading = useDownloading()
  const [failed, setFailed] = useState<BibleVersionId | null>(null)
  const readable = readableVersions(downloaded)
  const others = downloadableVersions.filter((id) => !readable.includes(id))
  const details = (id: BibleVersionId) => {
    const { abbreviation, language } = getBibleVersion(id)
    return `${abbreviation} · ${t("LanguageSwitcher.locale", { locale: language })}`
  }

  return (
    <>
      <Stack.Screen
        options={{ title: t("Reader.version"), presentation: "formSheet" }}
      />
      <TabScreen>
        <ChoiceList
          options={readable.map((id) => ({
            value: id,
            label: versionName(id),
            subtitle: details(id),
          }))}
          value={bibleVersionOf(profile.bibleVersion, locale)}
          onChange={(bibleVersion) => {
            setProfile({ bibleVersion })
            router.back()
          }}
        />

        {others.length > 0 ? (
          <Card title={t("Mobile.versions.download")} padded={false}>
            <View>
              {others.map((id, index) => (
                <ListRow
                  key={id}
                  label={versionName(id)}
                  subtitle={details(id)}
                  onPress={
                    downloading.includes(id)
                      ? undefined
                      : () => {
                          setFailed(null)
                          downloadVersion(id).catch(() => setFailed(id))
                        }
                  }
                  trailing={
                    downloading.includes(id) ? (
                      <ActivityIndicator
                        color={colors.accent}
                        accessibilityLabel={t("Mobile.versions.downloading", {
                          version: versionName(id),
                        })}
                      />
                    ) : (
                      <Download size={20} color={colors.foreground} />
                    )
                  }
                  last={index === others.length - 1}
                />
              ))}
            </View>
          </Card>
        ) : null}
        {failed ? (
          <Notice icon={CircleAlert}>
            {t("Mobile.versions.failed", { version: versionName(failed) })}
          </Notice>
        ) : others.length > 0 ? (
          <Body>{t("Mobile.versions.note")}</Body>
        ) : null}
      </TabScreen>
    </>
  )
}
