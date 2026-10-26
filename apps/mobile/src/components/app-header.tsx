import { Image, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useColors } from "@/theme/use-colors"
import { spacing, typography } from "@/theme/metrics"

/** The logo and name on top of the tabs, like the web's mobile header. */
export function AppHeader() {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Image
        source={require("@/assets/images/splash-icon.png")}
        style={styles.logo}
        accessible={false}
      />
      <Text
        accessibilityRole="header"
        style={[styles.name, { color: colors.foreground }]}
      >
        Bible Plan
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: { width: 30, height: 30 },
  name: { ...typography.h2, fontSize: 19 },
})
