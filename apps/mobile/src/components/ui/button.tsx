import type { LucideIcon } from "lucide-react-native"
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { haptics } from "@/lib/haptics"
import type { Colors } from "@/theme/colors"
import { radius, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** Same variants as the web's buttons. */
type Variant = "primary" | "outline" | "secondary" | "ghost" | "destructive"

type ButtonProps = Omit<PressableProps, "style"> & {
  title: string
  icon?: LucideIcon
  variant?: Variant
  size?: "md" | "sm"
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

function foreground(variant: Variant, colors: Colors) {
  if (variant === "primary") return colors.primaryForeground
  if (variant === "destructive") return colors.destructive
  return colors.foreground
}

/** A pill button, night blue (gold in the dark) like the web's. */
export function Button({
  title,
  icon: Icon,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const color = foreground(variant, colors)
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: loading }}
      disabled={inactive}
      onPress={(event) => {
        haptics.press()
        onPress?.(event)
      }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        styles[variant],
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {Icon ? <Icon size={size === "sm" ? 16 : 18} color={color} /> : null}
          <Text
            style={[styles.label, size === "sm" && styles.labelSm, { color }]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sm: { minHeight: 36, paddingHorizontal: 14, gap: 6 },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.background, borderColor: colors.border },
  secondary: { backgroundColor: colors.muted },
  ghost: { backgroundColor: "transparent" },
  destructive: { backgroundColor: colors.destructiveSoft },
  pressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.5 },
  label: { ...typography.body, fontFamily: typography.label.fontFamily },
  labelSm: { fontSize: 14, lineHeight: 20 },
}))
