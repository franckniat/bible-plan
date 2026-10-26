import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

export default function BibleStack() {
  const t = useTranslations("App.nav")
  return <LargeTitleStack name="bible" title={t("bible")} />
}
