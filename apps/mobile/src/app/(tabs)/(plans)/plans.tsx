import { planTemplates, type Locale } from "@workspace/core"
import { router } from "expo-router"
import { ArrowRight, ListOrdered } from "lucide-react-native"
import { Text, View } from "react-native"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import { TemplateCard } from "@/components/plans/template-card"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { usePlans } from "@/repositories/plans"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** The plans followed on this phone, and the templates to start one. */
export default function PlansScreen() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const format = useFormatter()
  const colors = useColors()
  const plans = usePlans()
  const date = (value: string) =>
    format.dateTime(new Date(`${value}T00:00:00.000Z`), {
      dateStyle: "medium",
      timeZone: "UTC",
    })
  const heading = [typography.h2, { color: colors.foreground }]

  return (
    <TabScreen>
      {plans.length > 0 ? (
        <Card title={t("Plans.title")} padded={false}>
          <View>
            {plans.map((plan, index) => (
              <ListRow
                key={plan.id}
                label={plan.title}
                subtitle={`${t("Plans.dates", {
                  start: date(plan.startDate),
                  end: date(plan.endDate),
                })} · ${t("Plans.days", { days: plan.totalDays })}`}
                last={index === plans.length - 1}
              />
            ))}
          </View>
        </Card>
      ) : (
        <Card title={t("Plans.empty.title")}>
          <Body>{t("Plans.empty.description")}</Body>
        </Card>
      )}

      <Card title={t("PlanWizard.type.chapters.label")}>
        <Body>{t("PlanWizard.type.chapters.description")}</Body>
        <Button
          title={t("Plans.new")}
          icon={ListOrdered}
          variant="outline"
          onPress={() => router.push("/new-plan")}
        />
      </Card>

      <Text accessibilityRole="header" style={heading}>
        {t("Templates.title")}
      </Text>
      <Body>{t("Templates.description")}</Body>
      {planTemplates.map((template) => (
        <TemplateCard key={template.key} template={template}>
          <Button
            title={t("Templates.choose")}
            accessibilityLabel={t("Templates.chooseLabel", {
              title: template.title[locale],
            })}
            icon={ArrowRight}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/new-plan",
                params: { template: template.key },
              })
            }
          />
        </TemplateCard>
      ))}
    </TabScreen>
  )
}
