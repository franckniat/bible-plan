import type { LucideIcon } from "lucide-react-native"
import { Text, View } from "react-native"

import { radius, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A small tag next to a title (web: a prayer's category, « Église »). */
export function Badge({
  label,
  icon: Icon,
  variant = "secondary",
}: {
  label: string
  icon?: LucideIcon
  variant?: "secondary" | "outline" | "accent"
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <View style={[styles.badge, styles[variant]]}>
      {Icon ? <Icon size={13} color={colors.foreground} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  secondary: { backgroundColor: colors.muted },
  outline: { borderColor: colors.border },
  accent: { backgroundColor: colors.accentSoft },
  label: { ...typography.label, fontSize: 13, color: colors.foreground },
}))
