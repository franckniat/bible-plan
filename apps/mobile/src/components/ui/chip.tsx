import type { LucideIcon } from "lucide-react-native"
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native"

import { haptics } from "@/lib/haptics"
import { fontFamily } from "@/theme/fonts"
import { radius, spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A filter pill; the selected one is filled (web: « Actifs · 4 »). */
export function Chip({
  label,
  selected,
  icon: Icon,
  onPress,
  style,
}: {
  label: string
  selected?: boolean
  icon?: LucideIcon
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const color = selected ? colors.primaryForeground : colors.foreground
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        haptics.tap()
        onPress?.()
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {Icon ? <Icon size={16} color={color} /> : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  label: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20 },
}))
