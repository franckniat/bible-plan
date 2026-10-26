import { Stack } from "expo-router"
import { useTranslations } from "use-intl"

import { Screen } from "@/components/screen"

/** Opened by a prayer time notification (bibleplan://prayer-time). */
export default function PrayerTimeScreen() {
  const t = useTranslations("Mobile.prayerTime")
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen title={t("title")} />
    </>
  )
}
