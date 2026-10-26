import type { ReactNode } from "react"
import { ScrollView, StyleSheet, Text } from "react-native"

import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** A tab's page: a serif title and an optional lead, like the web's pages. */
export function Screen({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  const colors = useColors()
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text
        accessibilityRole="header"
        style={[typography.title, { color: colors.foreground }]}
      >
        {title}
      </Text>
      {description ? <Body>{description}</Body> : null}
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
})
