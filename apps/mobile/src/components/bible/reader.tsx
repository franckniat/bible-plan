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
import * as Clipboard from "expo-clipboard"
import {
  Check,
  ChevronLeft,
  Circle,
  CircleCheck,
  ChevronRight,
  Columns2,
  Copy,
  Share2,
  Type,
} from "lucide-react-native"
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { versionName } from "@/bible/versions"
import { ChapterPager } from "@/components/bible/chapter-pager"
import { ChapterText } from "@/components/bible/chapter-text"
import { HeaderButton } from "@/components/bible/header-button"
import { HighlightRow } from "@/components/bible/highlight-row"
import { NeighborChapter } from "@/components/bible/neighbor-chapter"
import { PanelAction } from "@/components/bible/panel-action"
import { SelectionPanel } from "@/components/bible/selection-panel"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { usePreferences } from "@/lib/preferences"
import { recordReading } from "@/lib/reading-history"
import { highlightVerses, useHighlights } from "@/repositories/highlights"
import { markReading, useReadingDone } from "@/repositories/plans"
import { bibleVersionOf, useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
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
  const pick = (chapter: number, verse: number) =>
    setPicked({ slug, selection: toggleVerse(selection, chapter, verse) })
  const clear = () => setPicked({ slug, selection: null })
  // "Copied" shows for the selection it was for, and not for long.
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2500)
    return () => clearTimeout(timer)
  }, [copied])
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
          <TabScreen key={slug}>
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
                    accessibilityLabel={t("Reader.next", {
                      chapter: label(next),
                    })}
                    onPress={() => go(next)}
                  />
                ) : null}
              </View>
            ) : null}
            {/* Room for the panel, so the last verses can be picked too. */}
            {selection ? <View style={styles.panelRoom} /> : null}
          </TabScreen>
        }
      />

      {selection && state.status === "ready" ? (
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
          {(() => {
            // The text as on the web: « … » then the reference and version.
            const reference = selectionReference(
              passage.book,
              selection,
              locale
            )
            const abbreviation = versification.abbreviation
            const text = selectionText(
              version,
              selection,
              state.text.chapters.find(
                ({ chapter }) => chapter === selection.chapter
              )?.verses ?? []
            )
            const key = `${selection.chapter}:${selection.verses.join(",")}`
            return (
              <>
                <PanelAction
                  icon={copied === key ? Check : Copy}
                  label={
                    copied === key
                      ? t("Reader.selection.copied")
                      : t("Reader.selection.copy")
                  }
                  onPress={async () => {
                    await Clipboard.setStringAsync(
                      `« ${text} »\n${reference} ${abbreviation}`
                    )
                    setCopied(key)
                  }}
                />
                <PanelAction
                  icon={Columns2}
                  label={t("Reader.selection.compare")}
                  onPress={() => {
                    // The other versions number some verses differently:
                    // compare the verses of the canon.
                    const canon = canonVersesOf(
                      passage.book,
                      selection.chapter,
                      selection.verses,
                      versification
                    )
                    router.push({
                      pathname: "/compare",
                      params: {
                        book: passage.book,
                        chapter: String(selection.chapter),
                        from: String(canon[0]),
                        to: String(canon.at(-1)),
                      },
                    })
                  }}
                />
                <PanelAction
                  icon={Share2}
                  label={t("Reader.selection.share")}
                  onPress={() =>
                    void Share.share({
                      title: `${reference} ${abbreviation}`,
                      message: `« ${text} » — ${reference} ${abbreviation}`,
                    })
                  }
                />
              </>
            )
          })()}
        </SelectionPanel>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chapter: { gap: spacing.sm },
  panelRoom: { height: 400 },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
