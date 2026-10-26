import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

export default function SettingsStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="settings" title={t("settings")} />
}
