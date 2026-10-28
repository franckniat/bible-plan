import { addDays, getWeekday, type IsoDate } from "@workspace/core"
import { Pressable, Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import type { PlanDayView } from "@/repositories/plans"
import { brand } from "@/theme/colors"
import { fontFamily } from "@/theme/fonts"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** A month of the calendar, "2026-11". */
export type Month = string

export type DayStatus = "done" | "late" | "upcoming"

/** Read, late (planned before today and not all read) or to come. */
export function dayStatus(day: PlanDayView, today: IsoDate): DayStatus {
  if (day.readings.every((reading) => reading.completedAt)) return "done"
  return day.date < today ? "late" : "upcoming"
}

export const monthOf = (date: IsoDate): Month => date.slice(0, 7)

/** The month before or after. */
export function shiftMonth(month: Month, by: number): Month {
  const [year, number] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year!, number! - 1 + by, 1))
  return date.toISOString().slice(0, 7)
}

/** Dates of a month. */
export function monthDates(month: Month): IsoDate[] {
  const [year, number] = month.split("-").map(Number)
  const length = new Date(Date.UTC(year!, number!, 0)).getUTCDate()
  return Array.from({ length }, (_, index) => addDays(`${month}-01`, index))
}

/**
 * A month of a plan, Monday first, as on the web: each reading day colored
 * by its status, today circled. Pressing a day selects it.
 */
export function PlanCalendar({
  month,
  days,
  today,
  selected,
  onSelect,
}: {
  month: Month
  /** The plan's days, by date. */
  days: ReadonlyMap<IsoDate, PlanDayView>
  today: IsoDate
  selected: IsoDate | null
  onSelect: (date: IsoDate) => void
}) {
  const t = useTranslations("PlanDetail")
  const format = useFormatter()
  const styles = useThemedStyles(themedStyles)
  const dates = monthDates(month)
  // Blank cells before the 1st, Monday first.
  const offset = (getWeekday(dates[0]!) + 6) % 7
  const cells: (IsoDate | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...dates,
  ]
  // 2023-01-02 is a Monday.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    format.dateTime(new Date(`${addDays("2023-01-02", index)}T00:00:00Z`), {
      weekday: "narrow",
      timeZone: "UTC",
    })
  )

  return (
    <View style={styles.calendar}>
      <View style={styles.row}>
        {weekdays.map((weekday, index) => (
          <Text key={index} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) return <View key={`blank-${index}`} style={styles.cell} />
          const day = days.get(date)
          const status = day ? dayStatus(day, today) : null
          return (
            <View key={date} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: date === selected }}
                accessibilityLabel={`${format.dateTime(
                  new Date(`${date}T00:00:00Z`),
                  { dateStyle: "long", timeZone: "UTC" }
                )}${status ? ` · ${t(`legend.${status}`)}` : ""}`}
                disabled={!day}
                onPress={() => onSelect(date)}
                style={[
                  styles.day,
                  status && styles[status],
                  date === today && styles.today,
                  date === selected && styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.number,
                    !day && styles.off,
                    status === "done" && styles.numberDone,
                  ]}
                >
                  {Number(date.slice(8))}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
      <View style={styles.legend}>
        {(["done", "late", "upcoming"] as const).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.swatch, styles[status]]} />
            <Text style={styles.legendText}>{t(`legend.${status}`)}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  calendar: { gap: spacing.sm },
  row: { flexDirection: "row" },
  weekday: {
    ...typography.small,
    flex: 1,
    textAlign: "center",
    color: colors.mutedForeground,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  done: { backgroundColor: colors.accent },
  late: { backgroundColor: colors.destructiveSoft },
  upcoming: { backgroundColor: colors.muted },
  today: { borderColor: colors.foreground },
  selected: { borderColor: colors.primary },
  number: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.foreground,
  },
  // Night blue on gold, in both themes.
  numberDone: { color: brand.night },
  off: { color: colors.mutedForeground, opacity: 0.5 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { ...typography.small, color: colors.mutedForeground },
}))
