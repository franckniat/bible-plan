import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { haptics } from "@/lib/haptics"
import { spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** The size of an arrow's round button. */
const size = 48

/**
 * The previous and next chapters, two round arrows that float over the text
 * at the bottom of the reader and stay there while it scrolls, as in the
 * reading apps; an arrow with no chapter that way is left out.
 */
export function ChapterArrows({
  previous,
  next,
}: {
  previous: { label: string; onPress: () => void } | null
  next: { label: string; onPress: () => void } | null
}) {
  return (
    <View pointerEvents="box-none" style={styles.bar}>
      {previous ? <Arrow icon={ChevronLeft} {...previous} /> : <View />}
      {next ? <Arrow icon={ChevronRight} {...next} /> : null}
    </View>
  )
}

function Arrow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
}) {
  const themed = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptics.tap()
        onPress()
      }}
      style={({ pressed }) => [themed.arrow, pressed && themed.pressed]}
    >
      <Icon size={24} color={colors.foreground} />
    </Pressable>
  )
}

/** Room under the text, so that its last line is not under the arrows. */
export const arrowsRoom = size + 2 * spacing.md

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
  },
})

const themedStyles = createThemedStyles((colors) => ({
  arrow: {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pressed: { opacity: 0.75 },
}))
