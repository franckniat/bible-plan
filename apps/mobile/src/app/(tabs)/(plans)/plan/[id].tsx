import { getToday, type IsoDate } from "@workspace/core"
import { Stack, useLocalSearchParams } from "expo-router"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import {
  monthOf,
  PlanCalendar,
  shiftMonth,
  type Month,
} from "@/components/plans/plan-calendar"
import { ReadingRow } from "@/components/plans/reading-row"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Segmented } from "@/components/ui/segmented"
import {
  usePlanDetail,
  type PlanDayView,
  type PlanDetail,
} from "@/repositories/plans"
import { useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

const utc = (date: IsoDate) => new Date(`${date}T00:00:00.000Z`)

/** A plan: its progress, and its days by month, as a list or a calendar. */
export default function PlanScreen() {
  const t = useTranslations()
  const { id } = useLocalSearchParams<{ id: string }>()
  const plan = usePlanDetail(id)
  if (!plan) {
    return (
      <TabScreen>
        <Body>{t("CatchUp.errors.not_found")}</Body>
      </TabScreen>
    )
  }
  return <PlanView plan={plan} />
}

function PlanView({ plan }: { plan: PlanDetail }) {
  const t = useTranslations()
  const format = useFormatter()
  const colors = useColors()
  const profile = useProfile()
  const today = getToday(profile.timeZone)
  // The month of today while the plan runs, else its first or last.
  const [month, setMonth] = useState<Month>(
    monthOf(
      today < plan.startDate
        ? plan.startDate
        : today > plan.endDate
          ? plan.endDate
          : today
    )
  )
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [selected, setSelected] = useState<IsoDate | null>(null)

  const byDate = new Map(plan.days.map((day) => [day.date, day]))
  const monthDays = plan.days.filter((day) => monthOf(day.date) === month)
  const monthReadings = monthDays.flatMap((day) => day.readings)
  const first = monthOf(plan.startDate)
  const last = monthOf(plan.endDate)
  const date = (value: IsoDate) =>
    format.dateTime(utc(value), { dateStyle: "medium", timeZone: "UTC" })
  const percent = plan.totalReadings
    ? Math.round((100 * plan.completedReadings) / plan.totalReadings)
    : 0
  const progress = t("Plans.progress", {
    completed: plan.completedReadings,
    total: plan.totalReadings,
    percent,
  })
  const selectedDay =
    (selected && byDate.get(selected)) ||
    byDate.get(today) ||
    monthDays.find((day) => day.date >= today) ||
    null

  const monthArrow = (by: -1 | 1) => {
    const target = shiftMonth(month, by)
    const disabled = by < 0 ? target < first : target > last
    const Icon = by < 0 ? ChevronLeft : ChevronRight
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          by < 0 ? "PlanDetail.month.previous" : "PlanDetail.month.next"
        )}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={12}
        onPress={() => {
          setMonth(target)
          setSelected(null)
        }}
        style={{ opacity: disabled ? 0.3 : 1 }}
      >
        <Icon size={24} color={colors.foreground} />
      </Pressable>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: plan.title }} />
      <TabScreen>
        <Card>
          <Text style={[typography.body, { color: colors.foreground }]}>
            {t("Plans.dates", {
              start: date(plan.startDate),
              end: date(plan.endDate),
            })}
          </Text>
          <ProgressBar
            ratio={percent / 100}
            label={t("Plans.progressLabel", { title: plan.title })}
          />
          <Body>{progress}</Body>
        </Card>

        <Segmented
          value={view}
          options={[
            { value: "calendar", label: t("PlanDetail.view.calendar") },
            { value: "list", label: t("PlanDetail.view.list") },
          ]}
          onChange={setView}
        />

        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {monthArrow(-1)}
            <View style={{ alignItems: "center" }}>
              <Text
                accessibilityRole="header"
                style={[typography.h3, { color: colors.foreground }]}
              >
                {format.dateTime(utc(`${month}-01`), {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </Text>
              <Body>
                {t("PlanDetail.monthProgress", {
                  completed: monthReadings.filter(
                    (reading) => reading.completedAt
                  ).length,
                  total: monthReadings.length,
                })}
              </Body>
            </View>
            {monthArrow(1)}
          </View>
          {view === "calendar" ? (
            <PlanCalendar
              month={month}
              days={byDate}
              today={today}
              selected={selectedDay?.date ?? null}
              onSelect={setSelected}
            />
          ) : null}
        </Card>

        {view === "calendar" ? (
          selectedDay ? (
            <DayCard day={selectedDay} plan={plan} today={today} />
          ) : null
        ) : (
          monthDays.map((day) => (
            <DayCard key={day.id} day={day} plan={plan} today={today} />
          ))
        )}
      </TabScreen>
    </>
  )
}

/** A day of the plan with its readings, to open and check. */
function DayCard({
  day,
  plan,
  today,
}: {
  day: PlanDayView
  plan: PlanDetail
  today: IsoDate
}) {
  const t = useTranslations()
  const format = useFormatter()
  const late =
    day.date < today && day.readings.some((reading) => !reading.completedAt)
  return (
    <Card
      title={t("PlanDetail.day", { day: day.day })}
      action={
        <Body>
          {day.date === today
            ? t("PlanDetail.today")
            : `${format.dateTime(utc(day.date), {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}${late ? ` · ${t("PlanDetail.late")}` : ""}`}
        </Body>
      }
      padded={false}
    >
      <View style={{ paddingBottom: spacing.xs }}>
        {day.readings.map((reading, index) => (
          <ReadingRow
            key={reading.id}
            reading={reading}
            trackNames={plan.trackNames}
            last={index === day.readings.length - 1}
          />
        ))}
      </View>
    </Card>
  )
}
