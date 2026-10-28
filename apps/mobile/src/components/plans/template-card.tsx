import type { Locale, PlanTemplate } from "@workspace/core"
import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** A plan ready to adopt, as on the web's templates page. */
export function TemplateCard({
  template,
  children,
}: {
  template: PlanTemplate
  /** Below the description (the button to start it). */
  children?: ReactNode
}) {
  const t = useTranslations("Templates")
  const locale = useLocale() as Locale
  const styles = useThemedStyles(themedStyles)
  return (
    <Card title={template.title[locale]}>
      <View style={styles.meta}>
        <Badge label={t("days", { days: template.days })} />
        <Badge label={t("readingsPerDay", { count: template.tracks.length })} />
      </View>
      <Text style={styles.description}>{template.description[locale]}</Text>
      {children}
    </Card>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  description: { ...typography.small, color: colors.mutedForeground },
}))
