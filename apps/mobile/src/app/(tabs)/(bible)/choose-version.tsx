import { getBibleVersion, type BibleVersionId } from "@workspace/bible-data"
import { router } from "expo-router"
import { Check, CircleAlert, Download } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { downloadVersion, useDownloading } from "@/bible/downloads"
import {
  downloadableVersions,
  readableVersions,
  versionName,
} from "@/bible/versions"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { Notice } from "@/components/ui/notice"
import { usePreferences } from "@/lib/preferences"
import { bibleVersionOf, setProfile, useProfile } from "@/repositories/profile"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * The versions, opened from the reader's header in a sheet: one card a
 * language (the app's first), each version with its abbreviation, licence
 * and year. A version not on the phone yet (public domain, from the
 * website) downloads on a tap, then becomes the one read.
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
  const current = bibleVersionOf(profile.bibleVersion, locale)
  const versions = [
    ...readable,
    ...downloadableVersions.filter((id) => !readable.includes(id)),
  ]
  const languages = [
    ...new Set(versions.map((id) => getBibleVersion(id).language)),
  ].sort((a, b) => Number(b === locale) - Number(a === locale))
  const details = (id: BibleVersionId) => {
    const { abbreviation, publicDomain, year } = getBibleVersion(id)
    return [
      abbreviation,
      publicDomain ? t("Reader.publicDomain") : null,
      year ? String(year) : null,
    ]
      .filter(Boolean)
      .join(" · ")
  }
  const choose = (id: BibleVersionId) => {
    if (readable.includes(id)) {
      setProfile({ bibleVersion: id })
      router.back()
      return
    }
    setFailed(null)
    downloadVersion(id).then(
      () => setProfile({ bibleVersion: id }),
      () => setFailed(id)
    )
  }

  return (
    <TabScreen>
      {/* A sheet has no header: its title is at the top of it. */}
      <Text
        accessibilityRole="header"
        style={[
          typography.h3,
          { color: colors.foreground, textAlign: "center" },
        ]}
      >
        {t("Reader.version")}
      </Text>
      {languages.map((language) => {
        const ids = versions.filter(
          (id) => getBibleVersion(id).language === language
        )
        return (
          <Card
            key={language}
            title={t("LanguageSwitcher.locale", { locale: language })}
            padded={false}
          >
            <View accessibilityRole="radiogroup">
              {ids.map((id, index) => (
                <ListRow
                  key={id}
                  label={versionName(id)}
                  subtitle={details(id)}
                  onPress={
                    downloading.includes(id) ? undefined : () => choose(id)
                  }
                  trailing={
                    downloading.includes(id) ? (
                      <ActivityIndicator
                        color={colors.accent}
                        accessibilityLabel={t("Mobile.versions.downloading", {
                          version: versionName(id),
                        })}
                      />
                    ) : !readable.includes(id) ? (
                      <Download size={20} color={colors.foreground} />
                    ) : id === current ? (
                      <Check size={20} color={colors.foreground} />
                    ) : (
                      // An empty slot rather than the chevron of other rows.
                      <View style={{ width: 20 }} />
                    )
                  }
                  last={index === ids.length - 1}
                />
              ))}
            </View>
          </Card>
        )
      })}
      {failed ? (
        <Notice icon={CircleAlert}>
          {t("Mobile.versions.failed", { version: versionName(failed) })}
        </Notice>
      ) : versions.length > readable.length ? (
        <Body>{t("Mobile.versions.note")}</Body>
      ) : null}
    </TabScreen>
  )
}
