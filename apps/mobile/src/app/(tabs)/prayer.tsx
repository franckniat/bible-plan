import { useTranslations } from "use-intl"

import { Screen } from "@/components/screen"

export default function PrayerScreen() {
  const t = useTranslations("App.nav")
  return <Screen title={t("prayer")} />
}
