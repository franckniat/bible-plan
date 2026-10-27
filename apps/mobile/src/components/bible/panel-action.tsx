import type { LucideIcon } from "lucide-react-native"
import { Pressable, Text } from "react-native"

import { haptics } from "@/lib/haptics"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** One action of the selection panel: an icon and a label, full width. */
export function PanelAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.press()
        onPress()
      }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon size={22} color={colors.foreground} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.muted },
  label: { ...typography.body, fontSize: 17, color: colors.foreground },
}))
