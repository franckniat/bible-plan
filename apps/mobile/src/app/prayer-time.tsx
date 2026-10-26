import { useTranslations } from "use-intl"

import { Screen } from "@/components/screen"

/** Opened by a prayer time notification (bibleplan://prayer-time). */
export default function PrayerTimeScreen() {
  const t = useTranslations("Mobile.prayerTime")
  return <Screen title={t("title")} />
}
