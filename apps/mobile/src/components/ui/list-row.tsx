import { ChevronRight, type LucideIcon } from "lucide-react-native"
import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"

import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A row of a list card (settings, choices), as in expense-tracker-237. */
export function ListRow({
  label,
  subtitle,
  icon: Icon,
  value,
  trailing,
  onPress,
  destructive,
  last,
}: {
  label: string
  subtitle?: string
  icon?: LucideIcon
  /** Right-aligned value text. */
  value?: string
  /** Right slot replacing the chevron (a switch, a badge…). */
  trailing?: ReactNode
  onPress?: () => void
  destructive?: boolean
  /** The last row of a card has no divider. */
  last?: boolean
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const tint = destructive ? colors.destructive : colors.foreground
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      {Icon ? (
        <View style={[styles.icon, destructive && styles.iconDestructive]}>
          <Icon size={19} color={tint} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing ??
        (onPress ? (
          <ChevronRight size={18} color={colors.mutedForeground} />
        ) : null)}
    </Pressable>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.muted },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDestructive: { backgroundColor: colors.destructiveSoft },
  text: { flex: 1, gap: 2 },
  label: { ...typography.body, fontFamily: typography.label.fontFamily },
  subtitle: { ...typography.small, color: colors.mutedForeground },
  value: {
    ...typography.small,
    color: colors.mutedForeground,
    maxWidth: "45%",
  },
}))
