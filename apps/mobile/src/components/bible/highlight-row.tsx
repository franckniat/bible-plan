import { highlightColors, type HighlightColor } from "@workspace/core"
import { Check, X } from "lucide-react-native"
import { Pressable, Text, View } from "react-native"
import { useTranslations } from "use-intl"

import { haptics } from "@/lib/haptics"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

import { highlightBackgrounds } from "./chapter-text"

/**
 * The "Highlight" action of the selection panel, as on the web: a dot per
 * color, and a way to remove the color of verses that have one.
 */
export function HighlightRow({
  current,
  onPick,
}: {
  /** The color all the selected verses share, if any. */
  current: HighlightColor | null
  onPick: (color: HighlightColor | null) => void
}) {
  const t = useTranslations("Reader.highlight")
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const pick = (color: HighlightColor | null) => {
    haptics.tap()
    onPick(color)
  }
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t("label")}</Text>
      <View style={styles.dots}>
        {highlightColors.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={t(`colors.${color}`)}
            accessibilityState={{ selected: current === color }}
            onPress={() => pick(color)}
            style={[
              styles.dot,
              { backgroundColor: highlightBackgrounds[color] },
            ]}
          >
            {current === color ? <Check size={18} color="#0a0a0a" /> : null}
          </Pressable>
        ))}
        {current ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("remove")}
            onPress={() => pick(null)}
            style={[styles.dot, styles.remove]}
          >
            <X size={18} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  row: { gap: spacing.sm },
  label: { ...typography.h3, color: colors.foreground },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dot: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  remove: { borderWidth: 1, borderColor: colors.border },
}))
