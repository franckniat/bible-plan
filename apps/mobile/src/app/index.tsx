import { books, getBookName } from "@workspace/core"
import { useTheme } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

const first = books[0]!
const last = books[books.length - 1]!

export default function HomeScreen() {
  const { colors } = useTheme()
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Bible Plan</Text>
      <Text style={{ color: colors.text }}>
        {books.length} livres · {getBookName(first.id, "fr")} →{" "}
        {getBookName(last.id, "fr")}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "600" },
})
