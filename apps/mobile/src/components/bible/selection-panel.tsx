import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react"
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native"
import { X } from "lucide-react-native"
import { useTranslations } from "use-intl"

import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** Pulled down this far, the sheet closes. */
const closeDistance = 80

/**
 * The options of a verse selection, in a sheet that rises from the bottom
 * like the reader's other sheets: a grabber to pull it down, the reference,
 * and the actions given as children. The reader stays usable above it (more
 * verses can be tapped), and `onTop` tells where the sheet starts, so the
 * reader keeps the verse tapped in view above it.
 */
export function SelectionPanel({
  reference,
  version,
  onClose,
  onTop,
  children,
}: {
  reference: string
  /** The abbreviation of the version, e.g. "LSG". */
  version: string
  onClose: () => void
  /** The height on the screen where the sheet starts, once laid out. */
  onTop?: (pageY: number) => void
  children?: ReactNode
}) {
  const t = useTranslations("Reader.selection")
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const sheet = useRef<ComponentRef<typeof View>>(null)
  // Where the sheet starts, told once it is in place (not while it rises).
  const settled = useRef(false)
  const report = useRef(() => {})
  useEffect(() => {
    report.current = () => sheet.current?.measureInWindow((_, y) => onTop?.(y))
  })
  // Rises from below, unless the phone asks for less motion. Once in place
  // (the animation runs in JS for its value to be read), it tells where it is.
  const [offset] = useState(() => new Animated.Value(400))
  useEffect(() => {
    const listener = offset.addListener(({ value }) => {
      const placed = Math.abs(value) < 0.5
      if (placed && !settled.current) report.current()
      settled.current = placed
    })
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) offset.setValue(0)
      else
        Animated.spring(offset, {
          toValue: 0,
          friction: 9,
          useNativeDriver: false,
        }).start()
    })
    return () => offset.removeListener(listener)
  }, [offset])

  // Pulled down by its grabber: it follows the finger, and closes far enough.
  const [pull] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6,
      onPanResponderMove: (_, gesture) =>
        offset.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > closeDistance) onClose()
        else
          Animated.spring(offset, {
            toValue: 0,
            useNativeDriver: false,
          }).start()
      },
    })
  )

  return (
    <Animated.View
      accessibilityRole="toolbar"
      accessibilityLabel={t("label")}
      onLayout={() => {
        if (settled.current) report.current()
      }}
      style={[styles.panel, { transform: [{ translateY: offset }] }]}
    >
      <View ref={sheet} {...pull.panHandlers} style={styles.handleArea}>
        <View style={styles.grabber} />
        <View style={styles.head}>
          <View style={styles.title}>
            <Text style={styles.caption}>{t("current")}</Text>
            <Text style={styles.reference}>
              {reference} <Text style={styles.version}>{version}</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            hitSlop={12}
            onPress={onClose}
          >
            <X size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
      {children}
    </Animated.View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handleArea: { gap: spacing.sm, paddingTop: spacing.sm },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  title: { flex: 1, gap: 2 },
  caption: { ...typography.small, color: colors.mutedForeground },
  reference: { ...typography.h3, fontSize: 20, color: colors.foreground },
  version: { ...typography.small, color: colors.mutedForeground },
}))
