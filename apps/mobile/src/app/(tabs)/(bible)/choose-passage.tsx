import {
  type BookId,
  books,
  formatPassage,
  getBookName,
  getChapterCount,
  getVerseCount,
  parsePassageSlug,
} from "@workspace/core"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native"
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
import { scrollTarget } from "@/lib/scroll-target"
import { useReadingHistory } from "@/lib/reading-history"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/**
 * The books of the Bible by testament, opened from the reader's header: a
 * book unfolds its chapters, and a chapter opens in the reader. The book
 * being read is unfolded, in view.
 */
export default function ChoosePassageScreen() {
  const t = useTranslations("BibleIndex")
  const locale = useLocale()
  const colors = useColors()
  const styles = useThemedStyles(themedStyles)
  const [last] = useReadingHistory()
  const reading = parsePassageSlug(last?.slug ?? "")
  const [open, setOpen] = useState<BookId | null>(reading?.book ?? null)
  // A chapter chosen: its verses to go to, as in the reading apps.
  const [chosen, setChosen] = useState<{
    book: BookId
    chapter: number
  } | null>(null)
  const tRead = useTranslations("Mobile.read")
  const scroll = useRef<ScrollViewInstance>(null)
  const scrolled = useRef(false)

  if (chosen) {
    const slug = `${chosen.book}.${chosen.chapter}`
    const go = (verse: number) => {
      haptics.tap()
      if (verse > 1) scrollTarget.set(slug, verse)
      openPassage(slug)
    }
    return (
      <View style={styles.screen}>
        <Text accessibilityRole="header" style={styles.title}>
          {tRead("goToVerse")}
        </Text>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tRead("backToChapters", {
              book: getBookName(chosen.book, locale),
            })}
            onPress={() => setChosen(null)}
            style={({ pressed }) => [styles.book, pressed && styles.pressed]}
          >
            <View style={styles.back}>
              <ChevronLeft size={18} color={colors.mutedForeground} />
              <Text style={[styles.name, styles.current]}>
                {getBookName(chosen.book, locale)} {chosen.chapter}
              </Text>
            </View>
          </Pressable>
          <View style={styles.grid}>
            {Array.from(
              { length: getVerseCount(chosen.book, chosen.chapter) },
              (_, index) => index + 1
            ).map((verse) => (
              <Pressable
                key={verse}
                accessibilityRole="button"
                accessibilityLabel={formatPassage(
                  {
                    book: chosen.book,
                    start: { chapter: chosen.chapter, verse },
                    end: { chapter: chosen.chapter, verse },
                  },
                  locale
                )}
                onPress={() => go(verse)}
                style={({ pressed }) => [
                  styles.cell,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.number}>{verse}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* A sheet has no header: its title is at the top of it. */}
      <Text accessibilityRole="header" style={styles.title}>
        {t("title")}
      </Text>
      <ScrollView
        ref={scroll}
        nestedScrollEnabled
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
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
                        if (count === 1)
                          setChosen({ book: book.id, chapter: 1 })
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
                                  setChosen({ book: book.id, chapter })
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
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  title: {
    ...typography.h3,
    textAlign: "center",
    color: colors.foreground,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  back: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
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
    // Larger with the phone's text size.
    minWidth: 52,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cellCurrent: { borderColor: colors.accentStrong, borderWidth: 2 },
  number: { ...typography.h3, color: colors.foreground },
}))
