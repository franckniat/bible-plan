import {
  canonVersesOf,
  colorsInVersion,
  getBibleVersion,
  selectionReference,
  selectionText,
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
import { router, Stack } from "expo-router"
import { Circle, CircleCheck, Type } from "lucide-react-native"
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native"
import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { versionName } from "@/bible/versions"
import { arrowsRoom, ChapterArrows } from "@/components/bible/chapter-arrows"
import { ChapterPager } from "@/components/bible/chapter-pager"
import { ChapterText } from "@/components/bible/chapter-text"
import { HeaderButton } from "@/components/bible/header-button"
import { NeighborChapter } from "@/components/bible/neighbor-chapter"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { usePreferences } from "@/lib/preferences"
import { recordReading } from "@/lib/reading-history"
import { scrollTarget } from "@/lib/scroll-target"
import { useVerseActions, verseActions } from "@/lib/verse-actions"
import { highlightVerses, useHighlights } from "@/repositories/highlights"
import { markReading, useReadingDone } from "@/repositories/plans"
import { bibleVersionOf, useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useReaderBackground } from "@/theme/reader-backgrounds"
import { useColors } from "@/theme/use-colors"

/**
 * A passage read offline, from its slug (e.g. "John.3"); `onGo` opens another
 * one (the previous or next chapter, the whole chapter). The passage shown
 * joins the reading history, and the Bible tab opens on it.
 */
export function Reader({
  slug,
  reading,
  onGo,
}: {
  slug: string
  /** The plan reading this passage is, to mark it as read from here. */
  reading?: string
  onGo: (slug: string) => void
}) {
  const t = useTranslations()
  const locale = useLocale()
  const colors = useColors()
  const profile = useProfile()
  const { reader } = usePreferences()
  const background = useReaderBackground()
  const version = bibleVersionOf(profile.bibleVersion, locale)
  const passage = parsePassageSlug(slug)
  const state = usePassage(passage, version)
  const done = useReadingDone(reading)
  // Verses picked in this passage; another passage starts with none.
  const [picked, setPicked] = useState<{
    slug: string
    selection: VerseSelection | null
  }>({ slug, selection: null })
  const selection = picked.slug === slug ? picked.selection : null
  const pick = (chapter: number, verse: number, pageY: number) => {
    tapY.current = pageY
    setPicked({ slug, selection: toggleVerse(selection, chapter, verse) })
  }
  // The verse tapped stays in view above the options' sheet.
  const scroll = useRef<ScrollViewInstance>(null)
  const scrollY = useRef(0)
  const tapY = useRef<number | null>(null)
  const { sheetHeight } = useVerseActions()
  const keepInView = () => {
    const y = tapY.current
    if (y === null || sheetHeight === null) return
    const top = Dimensions.get("window").height - sheetHeight
    // Close to the sheet or under it: the verse goes up, with room for the
    // rest of it below the line tapped.
    if (y < top - 160) return
    const shift = y - Math.max(120, top - 260)
    tapY.current = y - shift
    scroll.current?.scrollTo({ y: scrollY.current + shift, animated: true })
  }
  // Once the sheet is open, and for each verse tapped while it is.
  useEffect(keepInView, [sheetHeight, selection])
  const clear = () => setPicked({ slug, selection: null })
  // "Go to a verse": once the verse is laid out, the reader scrolls to it.
  const chapterTops = useRef<Record<number, number>>({})
  const textTops = useRef<Record<number, number>>({})
  const verseTops = useRef<Record<number, Record<number, number>>>({})
  const goToTarget = () => {
    const verse = scrollTarget.peek(slug)
    const chapter = passage?.start.chapter
    if (verse === null || chapter === undefined) return
    const top = chapterTops.current[chapter]
    const text = textTops.current[chapter]
    const line = verseTops.current[chapter]?.[verse]
    if (top === undefined || text === undefined || line === undefined) return
    scrollTarget.clear()
    scroll.current?.scrollTo({ y: Math.max(0, top + text + line - 16) })
  }
  const valid = passage !== null
  useEffect(() => {
    if (valid) recordReading(slug)
  }, [slug, valid])
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

  // The options of the verses selected, for their native sheet: opened with
  // the first verse, closed with the last.
  const ready = state.status === "ready" ? state.text : null
  const selectionColors =
    passage && selection ? colorsOf(selection.chapter, selection.verses) : {}
  useEffect(() => {
    if (!passage || !selection || !ready) {
      verseActions.set(null)
      return
    }
    const reference = selectionReference(passage.book, selection, locale)
    const abbreviation = versification.abbreviation
    const text = selectionText(
      version,
      selection,
      ready.chapters.find(({ chapter }) => chapter === selection.chapter)
        ?.verses ?? []
    )
    // The other versions number some verses differently: the canon's.
    const canon = canonVersesOf(
      passage.book,
      selection.chapter,
      selection.verses,
      versification
    )
    const opened = verseActions.get().actions !== null
    verseActions.set({
      key: `${slug}:${selection.chapter}:${selection.verses.join(",")}`,
      reference,
      version: abbreviation,
      color: sharedColor(selectionColors, selection.verses),
      highlight: (color) =>
        highlightVerses({
          book: passage.book,
          chapter: selection.chapter,
          verses: canon,
          color,
        }),
      copyText: `« ${text} »\n${reference} ${abbreviation}`,
      share: () =>
        void Share.share({
          title: `${reference} ${abbreviation}`,
          message: `« ${text} » — ${reference} ${abbreviation}`,
        }),
      compare: () => {
        clear()
        // Once the sheet has gone.
        setTimeout(
          () =>
            router.push({
              pathname: "/compare",
              params: {
                book: passage.book,
                chapter: String(selection.chapter),
                from: String(canon[0]),
                to: String(canon.at(-1)),
              },
            }),
          350
        )
      },
      close: clear,
    })
    if (!opened) router.push("/verse-actions")
    // Read again when the verses, their colors or the text change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, JSON.stringify(selection), JSON.stringify(selectionColors), ready])
  // Leaving the reader leaves no options behind.
  useEffect(() => () => verseActions.set(null), [])

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
    onGo(`${to.book}.${to.chapter}`)
  const label = (to: { book: typeof passage.book; chapter: number }) =>
    `${getBookName(to.book, locale, "short")} ${to.chapter}`

  return (
    <>
      <Stack.Screen
        options={{
          title: formatPassage(passage, locale),
          headerLargeTitle: false,
          headerTitle: () => (
            <View style={styles.header}>
              <HeaderButton
                label={formatPassage(passage, locale)}
                accessibilityLabel={t("Mobile.read.choosePassage", {
                  passage: formatPassage(passage, locale),
                })}
                onPress={() => router.push("/choose-passage")}
              />
              <HeaderButton
                label={versification.abbreviation}
                accessibilityLabel={t("Mobile.read.chooseVersion", {
                  version: versionName(version),
                })}
                onPress={() => router.push("/choose-version")}
              />
            </View>
          ),
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
      <ChapterPager
        pageKey={slug}
        previous={
          previous ? (
            <NeighborChapter {...previous} version={version} look={reader} />
          ) : null
        }
        next={
          next ? (
            <NeighborChapter {...next} version={version} look={reader} />
          ) : null
        }
        onPrevious={() => previous && go(previous)}
        onNext={() => next && go(next)}
        current={
          // Another passage starts at the top.
          <TabScreen
            key={slug}
            backgroundColor={background}
            scrollRef={scroll}
            onScrollY={(y) => {
              scrollY.current = y
            }}
          >
            {state.status === "loading" ? (
              <ActivityIndicator
                color={colors.accent}
                accessibilityLabel={t("Reader.loading")}
              />
            ) : state.status === "error" ? (
              <Body>{t("Reader.loadFailed")}</Body>
            ) : (
              state.text.chapters.map(({ chapter, verses }) => (
                <View
                  key={chapter}
                  style={styles.chapter}
                  onLayout={(event) => {
                    chapterTops.current[chapter] = event.nativeEvent.layout.y
                    goToTarget()
                  }}
                >
                  {state.text.chapters.length > 1 ? (
                    <Text
                      style={[typography.h3, { color: colors.mutedForeground }]}
                    >
                      {t("Reader.chapter", { chapter })}
                    </Text>
                  ) : null}
                  <View
                    onLayout={(event) => {
                      textTops.current[chapter] = event.nativeEvent.layout.y
                      goToTarget()
                    }}
                  >
                    <ChapterText
                      version={version}
                      verses={verses}
                      look={reader}
                      onVerseTops={(tops) => {
                        verseTops.current[chapter] = {
                          ...verseTops.current[chapter],
                          ...tops,
                        }
                        goToTarget()
                      }}
                      highlights={colorsOf(
                        chapter,
                        verses.map(([number]) => number)
                      )}
                      selected={
                        selection?.chapter === chapter ? selection.verses : []
                      }
                      onPressVerse={(verse, pageY) =>
                        pick(chapter, verse, pageY)
                      }
                    />
                  </View>
                </View>
              ))
            )}

            {!whole ? (
              <Button
                title={t("Reader.wholeChapter")}
                variant="outline"
                onPress={() =>
                  onGo(
                    `${passage.book}.${passage.start.chapter}${
                      single ? "" : `-${passage.end.chapter}`
                    }`
                  )
                }
              />
            ) : null}

            {reading && state.status === "ready" ? (
              <Button
                title={t(
                  done ? "Reader.reading.done" : "Reader.reading.markDone"
                )}
                icon={done ? CircleCheck : Circle}
                variant={done ? "secondary" : "primary"}
                accessibilityRole="checkbox"
                accessibilityLabel={t("Reader.reading.markDone")}
                accessibilityState={{ checked: done }}
                onPress={() => markReading(reading, !done)}
              />
            ) : null}

            {/* Room for the arrows, so the last line is not under them. */}
            <View style={{ height: arrowsRoom }} />
            {/* Room for the sheet, so the last verses can be picked too. */}
            {selection ? <View style={styles.panelRoom} /> : null}
          </TabScreen>
        }
      />
      <ChapterArrows
        previous={
          previous
            ? {
                label: t("Reader.previous", { chapter: label(previous) }),
                onPress: () => go(previous),
              }
            : null
        }
        next={
          next
            ? {
                label: t("Reader.next", { chapter: label(next) }),
                onPress: () => go(next),
              }
            : null
        }
      />
    </>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chapter: { gap: spacing.sm },
  panelRoom: { height: 400 },
})
