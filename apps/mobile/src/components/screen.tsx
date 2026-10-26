import type { ReactNode } from "react"
import { ScrollView, StyleSheet, Text } from "react-native"

import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * Scrollable body of a tab under its native large title. The ScrollView must
 * be the screen's first child with automatic insets, so that iOS shrinks
 * the large title into the bar while scrolling.
 */
export function TabScreen({ children }: { children?: ReactNode }) {
  const colors = useColors()
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  )
}

/** A centred screen with a title, for screens outside the tabs. */
export function Screen({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  const colors = useColors()
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text
        accessibilityRole="header"
        style={[typography.title, { color: colors.foreground }]}
      >
        {title}
      </Text>
      {children}
    </ScrollView>
  )
}

export function Body({ children }: { children: ReactNode }) {
  const colors = useColors()
  return (
    <Text style={[typography.body, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
})
