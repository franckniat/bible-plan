import { Switch, Text, View } from "react-native"

import { spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A list row with a switch, for on / off settings. */
export function SwitchRow({
  label,
  subtitle,
  value,
  onValueChange,
  disabled,
  last,
}: {
  label: string
  subtitle?: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  last?: boolean
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.input }}
        thumbColor={colors.card}
        // react-native-web colours the thumb of an active switch on its own.
        {...{ activeThumbColor: colors.card }}
      />
    </View>
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
  text: { flex: 1, gap: 2 },
  label: {
    ...typography.body,
    fontFamily: typography.label.fontFamily,
    color: colors.foreground,
  },
  subtitle: { ...typography.small, color: colors.mutedForeground },
}))
