import { View } from "react-native"

import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** Progress from 0 to 1, in gold (a plan's readings, a badge's next level). */
export function ProgressBar({
  ratio,
  height = 8,
  label,
}: {
  ratio: number
  height?: number
  /** Read by screen readers, e.g. "12 / 33 lectures". */
  label?: string
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const clamped = Math.min(1, Math.max(0, ratio))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: colors.accent,
        }}
      />
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  track: { width: "100%", backgroundColor: colors.muted, overflow: "hidden" },
}))
