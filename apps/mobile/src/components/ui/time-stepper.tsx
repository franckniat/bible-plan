import { Minus, Plus } from "lucide-react-native"
import { Pressable, Text, View } from "react-native"

import { haptics } from "@/lib/haptics"
import { fontFamily } from "@/theme/fonts"
import { radius, spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** "HH:MM" moved by `minutes`, around the clock. */
export function shiftTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number) as [number, number]
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/** A time of day, its hours and minutes moved by buttons (5-minute steps). */
export function TimeStepper({
  value,
  onChange,
  step = 5,
  label,
}: {
  value: string
  onChange: (value: string) => void
  step?: number
  label: string
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const button = (minutes: number, description: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description}
      hitSlop={6}
      onPress={() => {
        haptics.tap()
        onChange(shiftTime(value, minutes))
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {minutes > 0 ? (
        <Plus size={18} color={colors.foreground} />
      ) : (
        <Minus size={18} color={colors.foreground} />
      )}
    </Pressable>
  )
  const [hours, minutes] = value.split(":")
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${value}`}
      style={styles.row}
    >
      <View style={styles.part}>
        {button(-60, "-1 h")}
        <Text style={styles.value}>{hours}</Text>
        {button(60, "+1 h")}
      </View>
      <Text style={styles.value}>:</Text>
      <View style={styles.part}>
        {button(-step, `-${step} min`)}
        <Text style={styles.value}>{minutes}</Text>
        {button(step, `+${step} min`)}
      </View>
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  part: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.muted,
  },
  pressed: { opacity: 0.7 },
  value: {
    fontFamily: fontFamily.heading,
    fontSize: 34,
    lineHeight: 42,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
    minWidth: 44,
    textAlign: "center",
  },
}))
