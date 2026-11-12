import { planTemplates, type Locale } from "@workspace/core"
import { router } from "expo-router"
import {
  ArrowRight,
  CalendarDays,
  Clock,
  ListOrdered,
  Shapes,
} from "lucide-react-native"
import { useState } from "react"
import { Text, View } from "react-native"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import { TemplateCard } from "@/components/plans/template-card"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { Segmented } from "@/components/ui/segmented"
import { usePlans } from "@/repositories/plans"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** The plans followed on this phone, and the templates to start one. */
export default function PlansScreen() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const format = useFormatter()
  const colors = useColors()
  const [view, setView] = useState<"current" | "archived">("current")
  const current = usePlans()
  const archived = usePlans(true)
  const plans = view === "current" ? current : archived
  const date = (value: string) =>
    format.dateTime(new Date(`${value}T00:00:00.000Z`), {
      dateStyle: "medium",
      timeZone: "UTC",
    })
  const heading = [typography.h2, { color: colors.foreground }]

  return (
    <TabScreen>
      {archived.length > 0 ? (
        <Segmented
          value={view}
          options={[
            {
              value: "current",
              label: t("Plans.views.current", { count: current.length }),
            },
            {
              value: "archived",
              label: t("Plans.views.archived", { count: archived.length }),
            },
          ]}
          onChange={setView}
        />
      ) : null}
      {plans.length === 0 && view === "archived" ? (
        <Body>{t("Plans.archivedEmpty")}</Body>
      ) : plans.length > 0 ? (
        <Card title={t("Plans.title")} padded={false}>
          <View>
            {plans.map((plan, index) => (
              <ListRow
                key={plan.id}
                label={plan.title}
                value={plan.status === "PAUSED" ? t("Plans.paused") : undefined}
                subtitle={`${t("Plans.dates", {
                  start: date(plan.startDate),
                  end: date(plan.endDate),
                })} · ${t("PlanDetail.monthProgress", {
                  completed: plan.completedReadings,
                  total: plan.totalReadings,
                })}`}
                onPress={() =>
                  router.push({
                    pathname: "/plan/[id]",
                    params: { id: plan.id },
                  })
                }
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

      <Card title={t("Plans.new")} padded={false}>
        <View>
          {(["duration", "time", "chapters", "free"] as const).map(
            (type, index, all) => (
              <ListRow
                key={type}
                icon={
                  type === "chapters"
                    ? ListOrdered
                    : type === "time"
                      ? Clock
                      : type === "free"
                        ? Shapes
                        : CalendarDays
                }
                label={t(`PlanWizard.type.${type}.label`)}
                subtitle={t(`PlanWizard.type.${type}.description`)}
                onPress={() =>
                  router.push({ pathname: "/new-plan", params: { type } })
                }
                last={index === all.length - 1}
              />
            )
          )}
        </View>
      </Card>

      <Text accessibilityRole="header" style={heading}>
        {t("Templates.title")}
      </Text>
      <Body>{t("Templates.description")}</Body>
      {planTemplates.map((template) => (
        <TemplateCard key={template.key} template={template}>
          <Button
            testID={`template-${template.key}`}
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
