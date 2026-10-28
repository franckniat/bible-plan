import { ChevronDown } from "lucide-react-native"
import { Pressable, Text } from "react-native"

import { haptics } from "@/lib/haptics"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A pill of the reader's header that opens a chooser (passage, version). */
export function HeaderButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string
  accessibilityLabel: string
  onPress: () => void
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={() => {
        haptics.tap()
        onPress()
      }}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={16} color={colors.mutedForeground} />
    </Pressable>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
  },
  pressed: { backgroundColor: colors.accentSoft },
  label: { ...typography.h3, flexShrink: 1, color: colors.foreground },
}))
