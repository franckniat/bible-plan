import {
  canonVersesOf,
  colorsInVersion,
  getBibleVersion,
  selectionReference,
  sharedColor,
  toggleVerse,
  type VerseSelection,
} from "@workspace/bible-data"
import {
  adjacentChapter,
  coversWholeChapters,
  formatPassage,
  getBookName,
  parsePassageSlug,
} from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { ChevronLeft, ChevronRight, Type } from "lucide-react-native"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useState } from "react"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { ChapterText } from "@/components/bible/chapter-text"
import { HighlightRow } from "@/components/bible/highlight-row"
import { SelectionPanel } from "@/components/bible/selection-panel"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { usePreferences } from "@/lib/preferences"
import { highlightVerses, useHighlights } from "@/repositories/highlights"
import { bibleVersionOf, useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** A passage read offline, e.g. bibleplan://read/John.3 */
export default function ReadScreen() {
  const { passage: slug } = useLocalSearchParams<{ passage: string }>()
  const t = useTranslations()
  const locale = useLocale()
  const colors = useColors()
  const profile = useProfile()
  const { reader } = usePreferences()
  const version = bibleVersionOf(profile.bibleVersion, locale)
  const passage = parsePassageSlug(slug)
  const state = usePassage(passage, version)
  // Verses picked in this passage; another passage starts with none.
  const [picked, setPicked] = useState<{
    slug: string
    selection: VerseSelection | null
  }>({ slug, selection: null })
  const selection = picked.slug === slug ? picked.selection : null
  const pick = (chapter: number, verse: number) =>
    setPicked({ slug, selection: toggleVerse(selection, chapter, verse) })
  const clear = () => setPicked({ slug, selection: null })
  const book = passage?.book ?? "Gen"
  const versification = getBibleVersion(version)
  const highlighted = useHighlights(
    book,
    passage
      ? Array.from(
          { length: passage.end.chapter - passage.start.chapter + 1 },
          (_, index) => passage.start.chapter + index
        )
      : []
  )
  /** The colors of the verses of a chapter, in the version's numbering. */
  const colorsOf = (chapter: number, verses: readonly number[]) =>
    colorsInVersion(highlighted, book, chapter, verses, versification)

  if (!passage) {
    return (
      <>
        <Stack.Screen options={{ title: t("Mobile.read.notFound") }} />
        <TabScreen>
          <Body>{t("Mobile.read.invalid", { slug })}</Body>
        </TabScreen>
      </>
    )
  }

  const whole = coversWholeChapters(passage)
  const single = passage.start.chapter === passage.end.chapter
  // Previous and next chapters for a whole chapter, across books.
  const previous =
    whole && single
      ? adjacentChapter(passage.book, passage.start.chapter, -1)
      : null
  const next =
    whole && single
      ? adjacentChapter(passage.book, passage.start.chapter, 1)
      : null
  const go = (to: { book: typeof passage.book; chapter: number }) =>
    router.replace(`/read/${to.book}.${to.chapter}`)
  const label = (to: { book: typeof passage.book; chapter: number }) =>
    `${getBookName(to.book, locale, "short")} ${to.chapter}`

  return (
    <>
      <Stack.Screen
        options={{
          title: formatPassage(passage, locale),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Reader.settings.open")}
              hitSlop={12}
              onPress={() => router.push("/read-settings")}
            >
              <Type size={22} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <TabScreen>
        {state.status === "loading" ? (
          <ActivityIndicator
            color={colors.accent}
            accessibilityLabel={t("Reader.loading")}
          />
        ) : state.status === "error" ? (
          <Body>{t("Reader.loadFailed")}</Body>
        ) : (
          state.text.chapters.map(({ chapter, verses }) => (
            <View key={chapter} style={styles.chapter}>
              {state.text.chapters.length > 1 ? (
                <Text
                  style={[typography.h3, { color: colors.mutedForeground }]}
                >
                  {t("Reader.chapter", { chapter })}
                </Text>
              ) : null}
              <ChapterText
                version={version}
                verses={verses}
                look={reader}
                highlights={colorsOf(
                  chapter,
                  verses.map(([number]) => number)
                )}
                selected={
                  selection?.chapter === chapter ? selection.verses : []
                }
                onPressVerse={(verse) => pick(chapter, verse)}
              />
            </View>
          ))
        )}

        {!whole ? (
          <Button
            title={t("Reader.wholeChapter")}
            variant="outline"
            onPress={() =>
              router.replace(
                `/read/${passage.book}.${passage.start.chapter}${
                  single ? "" : `-${passage.end.chapter}`
                }`
              )
            }
          />
        ) : null}

        {previous || next ? (
          <View style={styles.navigation}>
            {previous ? (
              <Button
                title={label(previous)}
                icon={ChevronLeft}
                variant="outline"
                size="sm"
                accessibilityLabel={t("Reader.previous", {
                  chapter: label(previous),
                })}
                onPress={() => go(previous)}
              />
            ) : (
              <View />
            )}
            {next ? (
              <Button
                title={label(next)}
                icon={ChevronRight}
                variant="outline"
                size="sm"
                accessibilityLabel={t("Reader.next", { chapter: label(next) })}
                onPress={() => go(next)}
              />
            ) : null}
          </View>
        ) : null}
        {/* Room for the panel, so the last verses can be picked too. */}
        {selection ? <View style={styles.panelRoom} /> : null}
      </TabScreen>

      {selection ? (
        <SelectionPanel
          reference={selectionReference(passage.book, selection, locale)}
          version={getBibleVersion(version).abbreviation}
          onClose={clear}
        >
          <HighlightRow
            current={sharedColor(
              colorsOf(selection.chapter, selection.verses),
              selection.verses
            )}
            onPick={(color) =>
              highlightVerses({
                book: passage.book,
                chapter: selection.chapter,
                verses: canonVersesOf(
                  passage.book,
                  selection.chapter,
                  selection.verses,
                  versification
                ),
                color,
              })
            }
          />
        </SelectionPanel>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  chapter: { gap: spacing.sm },
  panelRoom: { height: 220 },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
