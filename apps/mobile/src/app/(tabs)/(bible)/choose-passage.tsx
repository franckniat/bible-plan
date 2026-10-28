import {
  type BookId,
  books,
  formatPassage,
  getChapterCount,
  parsePassageSlug,
} from "@workspace/core"
import { ChevronDown, ChevronRight, History } from "lucide-react-native"
import { Stack } from "expo-router"
import { useRef, useState } from "react"
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { haptics } from "@/lib/haptics"
import { openPassage } from "@/lib/open-passage"
import { useReadingHistory } from "@/lib/reading-history"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/**
 * The books of the Bible by testament, opened from the reader's header: a
 * book unfolds its chapters, and a chapter opens in the reader. The book
 * being read is unfolded, in view, under the other places read lately.
 */
export default function ChoosePassageScreen() {
  const t = useTranslations("BibleIndex")
  const locale = useLocale()
  const colors = useColors()
  const styles = useThemedStyles(themedStyles)
  const [last, ...earlier] = useReadingHistory()
  const reading = parsePassageSlug(last?.slug ?? "")
  const recent = earlier.slice(0, 5)
  const [open, setOpen] = useState<BookId | null>(reading?.book ?? null)
  const scroll = useRef<ScrollViewInstance>(null)
  const scrolled = useRef(false)

  return (
    <>
      <Stack.Screen
        options={{ title: t("title"), presentation: "formSheet" }}
      />
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        {recent.length > 0 ? (
          <View>
            <Text style={styles.testament}>{t("recent")}</Text>
            {recent.map((entry) => {
              const passage = parsePassageSlug(entry.slug)
              if (!passage) return null
              return (
                <Pressable
                  key={entry.slug}
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.tap()
                    openPassage(entry.slug)
                  }}
                  style={({ pressed }) => [
                    styles.book,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.recent}>
                    <History size={16} color={colors.mutedForeground} />
                    <Text style={styles.name}>
                      {formatPassage(passage, locale)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </Pressable>
              )
            })}
          </View>
        ) : null}
        {(["old", "new"] as const).map((testament) => (
          <View key={testament}>
            <Text style={styles.testament}>{t(`testament.${testament}`)}</Text>
            {books
              .filter((book) => book.testament === testament)
              .map((book) => {
                const name = book.names[locale].name
                const count = getChapterCount(book.id)
                const unfolded = open === book.id
                const Chevron = unfolded ? ChevronDown : ChevronRight
                return (
                  <View
                    key={book.id}
                    onLayout={(event) => {
                      // The book being read, once, near the top.
                      if (book.id !== reading?.book || scrolled.current) return
                      scrolled.current = true
                      scroll.current?.scrollTo({
                        y: Math.max(0, event.nativeEvent.layout.y - 80),
                        animated: false,
                      })
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: unfolded }}
                      onPress={() => {
                        haptics.tap()
                        if (count === 1) openPassage(`${book.id}.1`)
                        else setOpen(unfolded ? null : book.id)
                      }}
                      style={({ pressed }) => [
                        styles.book,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.name,
                          book.id === reading?.book && styles.current,
                        ]}
                      >
                        {name}
                      </Text>
                      <Chevron size={18} color={colors.mutedForeground} />
                    </Pressable>
                    {unfolded ? (
                      <View style={styles.grid}>
                        {Array.from({ length: count }, (_, i) => i + 1).map(
                          (chapter) => {
                            const current =
                              book.id === reading?.book &&
                              chapter === reading.start.chapter
                            return (
                              <Pressable
                                key={chapter}
                                accessibilityRole="button"
                                accessibilityLabel={t("chapter", {
                                  book: name,
                                  chapter,
                                })}
                                onPress={() => {
                                  haptics.tap()
                                  openPassage(`${book.id}.${chapter}`)
                                }}
                                style={({ pressed }) => [
                                  styles.cell,
                                  current && styles.cellCurrent,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <Text style={styles.number}>{chapter}</Text>
                              </Pressable>
                            )
                          }
                        )}
                      </View>
                    ) : null}
                  </View>
                )
              })}
          </View>
        ))}
      </ScrollView>
    </>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  testament: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.mutedForeground,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  book: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { ...typography.body, color: colors.foreground },
  recent: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  current: { fontFamily: typography.h3.fontFamily, color: colors.primary },
  pressed: { backgroundColor: colors.accentSoft },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cellCurrent: { borderColor: colors.accent, borderWidth: 2 },
  number: { ...typography.h3, color: colors.foreground },
}))
