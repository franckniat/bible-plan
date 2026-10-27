import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { X } from "lucide-react-native"
import { useTranslations } from "use-intl"

import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/**
 * The panel of a verse selection, above the tab bar as on the web: the
 * reference, a way to close it, and the actions given as children.
 */
export function SelectionPanel({
  reference,
  version,
  onClose,
  children,
}: {
  reference: string
  /** The abbreviation of the version, e.g. "LSG". */
  version: string
  onClose: () => void
  children?: ReactNode
}) {
  const t = useTranslations("Reader.selection")
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={t("label")}
      style={styles.panel}
    >
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
      {children}
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  title: { flex: 1, gap: 2 },
  caption: { ...typography.small, color: colors.mutedForeground },
  reference: { ...typography.h3, fontSize: 20, color: colors.foreground },
  version: { ...typography.small, color: colors.mutedForeground },
}))
