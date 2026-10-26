import { useTranslations } from "use-intl"

import { Screen } from "@/components/screen"

export default function PrayerScreen() {
  const t = useTranslations()
  return <Screen title={t("App.nav.prayer")} />
}
