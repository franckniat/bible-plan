import { useTranslations } from "use-intl"

import { Screen } from "@/components/screen"

export default function MoreScreen() {
  const t = useTranslations()
  return <Screen title={t("Mobile.tabs.more")} />
}
