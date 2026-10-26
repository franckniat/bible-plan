import type { ReactNode } from "react"
import { Text, View, type StyleProp, type ViewStyle } from "react-native"

import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** A white rounded card with a thin border, its title in Lora (web cards). */
export function Card({
  title,
  action,
  padded = true,
  style,
  children,
}: {
  title?: string
  /** Right side of the title row (a count, a link…). */
  action?: ReactNode
  /** False for a list of rows that reach the edges. */
  padded?: boolean
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  const styles = useThemedStyles(themedStyles)
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {title || action ? (
        <View style={[styles.head, !padded && styles.headPadded]}>
          {title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action ? <View style={styles.action}>{action}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    overflow: "hidden",
  },
  padded: { padding: spacing.lg },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headPadded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { ...typography.h2, color: colors.foreground, flexShrink: 1 },
  action: { flexShrink: 0 },
}))
