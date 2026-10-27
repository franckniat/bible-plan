import { getBookName, getChapterCount, isBookId } from "@workspace/core"
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router"
import { Pressable, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { TabScreen } from "@/components/screen"
import { haptics } from "@/lib/haptics"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** The chapters of a book, as a grid of numbers. */
export default function BookScreen() {
  const { book } = useLocalSearchParams<{ book: string }>()
  const t = useTranslations("BibleIndex")
  const locale = useLocale()
  const styles = useThemedStyles(themedStyles)
  if (!isBookId(book)) return <Redirect href="/bible" />
  const name = getBookName(book, locale)
  const count = getChapterCount(book)
  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <TabScreen>
        <View style={styles.grid}>
          {Array.from({ length: count }, (_, index) => index + 1).map(
            (chapter) => (
              <Pressable
                key={chapter}
                accessibilityRole="button"
                accessibilityLabel={t("chapter", { book: name, chapter })}
                onPress={() => {
                  haptics.tap()
                  router.push(`/read/${book}.${chapter}`)
                }}
                style={({ pressed }) => [
                  styles.cell,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.number}>{chapter}</Text>
              </Pressable>
            )
          )}
        </View>
      </TabScreen>
    </>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pressed: { backgroundColor: colors.accentSoft },
  number: { ...typography.h3, color: colors.foreground },
}))
