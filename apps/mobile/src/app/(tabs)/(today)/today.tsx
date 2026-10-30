import { getToday, type IsoDate } from "@workspace/core"
import { router } from "expo-router"
import { Sparkles } from "lucide-react-native"
import { View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { CatchUpNotice } from "@/components/plans/catch-up-notice"
import { ReadingRow } from "@/components/plans/reading-row"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTodayPlans, type TodayPlan } from "@/repositories/plans"
import { useProfile } from "@/repositories/profile"
import { spacing } from "@/theme/metrics"

/** The readings of the day in each plan followed. */
export default function TodayScreen() {
  const t = useTranslations()
  const profile = useProfile()
  const today = getToday(profile.timeZone)
  const plans = useTodayPlans(today)

  const meditate = (
    <Button
      title={t("App.today.shortcuts.meditate")}
      icon={Sparkles}
      variant="outline"
      onPress={() => router.push("/meditate")}
    />
  )

  if (plans.length === 0) {
    return (
      <TabScreen>
        <Card title={t("App.today.empty.title")}>
          <Body>{t("App.today.empty.description")}</Body>
          <Button
            title={t("App.today.empty.create")}
            onPress={() => router.navigate("/plans")}
          />
        </Card>
        {meditate}
      </TabScreen>
    )
  }
  return (
    <TabScreen>
      {plans.map((plan) => (
        <TodayPlanCard key={plan.id} plan={plan} today={today} />
      ))}
      {meditate}
    </TabScreen>
  )
}

function TodayPlanCard({ plan, today }: { plan: TodayPlan; today: IsoDate }) {
  const t = useTranslations()
  const format = useFormatter()
  const { day } = plan
  const note = !day
    ? t("App.today.finished")
    : plan.isToday
      ? day.readings.every((reading) => reading.completedAt)
        ? t("App.today.done")
        : null
      : t("App.today.next", {
          date: format.dateTime(new Date(`${day.date}T00:00:00.000Z`), {
            dateStyle: "long",
            timeZone: "UTC",
          }),
        })
  return (
    <Card
      title={plan.title}
      action={
        day ? <Body>{t("PlanDetail.day", { day: day.day })}</Body> : undefined
      }
      padded={false}
    >
      {plan.lateReadings > 0 ? (
        <CatchUpNotice
          planId={plan.id}
          late={plan.lateReadings}
          today={today}
        />
      ) : null}
      {note ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Body>{note}</Body>
        </View>
      ) : null}
      {day ? (
        <View>
          {day.readings.map((reading, index) => (
            <ReadingRow
              key={reading.id}
              reading={reading}
              trackNames={plan.trackNames}
              last={index === day.readings.length - 1}
            />
          ))}
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.lg }} />
      )}
    </Card>
  )
}
