import {
  adjacentChapter,
  coversWholeChapters,
  formatPassage,
  getBookName,
  parsePassageSlug,
} from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { ChapterText, defaultReaderLook } from "@/components/bible/chapter-text"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
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
  const version = bibleVersionOf(profile.bibleVersion, locale)
  const passage = parsePassageSlug(slug)
  const state = usePassage(passage, version)

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
      <Stack.Screen options={{ title: formatPassage(passage, locale) }} />
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
              <ChapterText verses={verses} look={defaultReaderLook} />
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
      </TabScreen>
    </>
  )
}

const styles = StyleSheet.create({
  chapter: { gap: spacing.sm },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
