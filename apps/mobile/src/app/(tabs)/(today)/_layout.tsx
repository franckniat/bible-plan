import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

export default function TodayStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="today" title={t("today")} />
}
