import { readingSpeeds } from "@workspace/core"
import { router } from "expo-router"
import {
  Bell,
  BookOpen,
  CircleAlert,
  CircleCheck,
  Clock,
  FileDown,
  FileUp,
  Gauge,
  Languages,
  Shapes,
  Smartphone,
} from "lucide-react-native"
import { useState } from "react"
import { View } from "react-native"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import { TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { Notice } from "@/components/ui/notice"
import { pickBackupFile, shareBackupFile } from "@/lib/backup-file"
import { setPreferences, usePreferences } from "@/lib/preferences"
import { versionName } from "@/bible/versions"
import { currentBackup, restoreBackup } from "@/repositories/backup"
import { bibleVersionOf, useProfile } from "@/repositories/profile"
import { spacing } from "@/theme/metrics"

/** The settings of the local profile, without an account. */
export default function SettingsScreen() {
  const t = useTranslations()
  const locale = useLocale()
  const profile = useProfile()
  const language = t("LanguageSwitcher.locale", { locale })
  const format = useFormatter()
  const { lastBackupAt } = usePreferences()
  const [openedAt] = useState(() => Date.now())
  // Without an account, nothing is kept elsewhere: a backup a month.
  const backupDue =
    lastBackupAt === null ||
    openedAt - Date.parse(lastBackupAt) > 30 * 24 * 60 * 60 * 1000
  /** What the last export or import gave, shown under the card. */
  const [backup, setBackup] = useState<
    | { status: "exportFailed" | "importFailed" }
    | { status: "imported"; count: number }
    | null
  >(null)
  const exportBackup = async () => {
    setBackup(null)
    try {
      await shareBackupFile(currentBackup(), t("Mobile.backup.export"))
      setPreferences({ lastBackupAt: new Date().toISOString() })
    } catch {
      setBackup({ status: "exportFailed" })
    }
  }
  const importBackup = async () => {
    setBackup(null)
    try {
      const text = await pickBackupFile()
      if (text !== null) {
        setBackup({ status: "imported", count: restoreBackup(text) })
      }
    } catch {
      setBackup({ status: "importFailed" })
    }
  }

  return (
    <TabScreen>
      <Card title={t("Mobile.settings.reading")} padded={false}>
        <View>
          <ListRow
            icon={BookOpen}
            label={t("Settings.bible.title")}
            value={versionName(bibleVersionOf(profile.bibleVersion, locale))}
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
            icon={Bell}
            label={t("Reminders.title")}
            subtitle={t("Reminders.description")}
            onPress={() => router.push("/settings/reminders")}
          />
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

      <Card title={t("Mobile.backup.title")} padded={false}>
        <View>
          {backupDue ? (
            <View style={{ padding: spacing.md, paddingBottom: 0 }}>
              <Notice icon={Smartphone}>
                {t(
                  lastBackupAt
                    ? "Mobile.backup.suggestAgain"
                    : "Mobile.backup.suggest"
                )}
              </Notice>
            </View>
          ) : null}
          <ListRow
            icon={FileDown}
            label={t("Mobile.backup.export")}
            subtitle={
              lastBackupAt
                ? t("Mobile.backup.lastExport", {
                    date: format.dateTime(new Date(lastBackupAt), {
                      dateStyle: "long",
                    }),
                  })
                : t("Mobile.backup.exportHint")
            }
            onPress={() => void exportBackup()}
          />
          <ListRow
            icon={FileUp}
            label={t("Mobile.backup.import")}
            subtitle={t("Mobile.backup.importHint")}
            onPress={() => void importBackup()}
            last
          />
        </View>
      </Card>
      {backup?.status === "imported" ? (
        <Notice icon={CircleCheck}>
          {t("Mobile.backup.imported", { count: backup.count })}
        </Notice>
      ) : backup ? (
        <Notice icon={CircleAlert}>
          {t(`Mobile.backup.${backup.status}`)}
        </Notice>
      ) : null}

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
