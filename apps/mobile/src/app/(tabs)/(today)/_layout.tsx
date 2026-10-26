import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

// A screen opened from a link gets a back button to the tab's root.
export const unstable_settings = { initialRouteName: "today" }

export default function TodayStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="today" title={t("today")} />
}
