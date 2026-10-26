import { useTranslations } from "use-intl"

import { Screen } from "@/components/screen"

export default function PlansScreen() {
  const t = useTranslations("App.nav")
  return <Screen title={t("plans")} />
}
