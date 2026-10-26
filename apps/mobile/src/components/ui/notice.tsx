import type { LucideIcon } from "lucide-react-native"
import type { ReactNode } from "react"
import { Text, View } from "react-native"

import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A gold box inside a card (web: « Une lecture vous attend dans ce plan »). */
export function Notice({
  icon: Icon,
  children,
  actions,
}: {
  icon?: LucideIcon
  children: string
  /** Buttons under the text. */
  actions?: ReactNode
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <View style={styles.notice}>
      <View style={styles.body}>
        {Icon ? <Icon size={20} color={colors.foreground} /> : null}
        <Text style={styles.text}>{children}</Text>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  notice: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  body: { flexDirection: "row", gap: spacing.sm },
  text: { ...typography.body, color: colors.foreground, flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
}))
