import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

// A screen opened from a link gets a back button to the tab's root.
export const unstable_settings = { initialRouteName: "bible" }

export default function BibleStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="bible" title={t("bible")} />
}
