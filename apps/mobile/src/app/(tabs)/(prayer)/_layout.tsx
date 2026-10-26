import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

export default function PrayerStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="prayer" title={t("prayer")} />
}
