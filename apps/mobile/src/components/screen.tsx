import { useTheme } from "expo-router"
import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"

/** A centred screen with a title, used until each screen gets its content. */
export function Screen({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  )
}

export function Body({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return <Text style={[styles.body, { color: colors.text }]}>{children}</Text>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "600", textAlign: "center" },
  body: { fontSize: 16, textAlign: "center" },
})
