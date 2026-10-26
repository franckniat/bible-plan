import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

export default function PlansStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="plans" title={t("plans")} />
}
