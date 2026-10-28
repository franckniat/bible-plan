import { planTemplates } from "@workspace/core"
import { Text } from "react-native"
import { useTranslations } from "use-intl"

import { TemplateCard } from "@/components/plans/template-card"
import { Body, TabScreen } from "@/components/screen"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** The plans followed on this phone, and the templates to start one. */
export default function PlansScreen() {
  const t = useTranslations("Templates")
  const colors = useColors()
  return (
    <TabScreen>
      <Text
        accessibilityRole="header"
        style={[typography.h2, { color: colors.foreground }]}
      >
        {t("title")}
      </Text>
      <Body>{t("description")}</Body>
      {planTemplates.map((template) => (
        <TemplateCard key={template.key} template={template} />
      ))}
    </TabScreen>
  )
}
