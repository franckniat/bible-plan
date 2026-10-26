import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { haptics } from "@/lib/haptics"
import { fontFamily } from "@/theme/fonts"
import { radius, spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** A choice between a few options (web: the theme toggle, tabs). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(themedStyles)
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const on = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return
              haptics.tap()
              onChange(option.value)
            }}
            style={[styles.item, on && styles.itemOn]}
          >
            <Text
              style={[styles.label, on && styles.labelOn]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  track: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  itemOn: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  labelOn: { color: colors.foreground },
}))
