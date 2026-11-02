import {
  formatPassage,
  getVerseCount,
  parsePassageSlug,
  type Locale,
} from "@workspace/core"
import { router, useLocalSearchParams } from "expo-router"
import {
  Bookmark,
  BookmarkCheck,
  Columns2,
  Link,
  Type,
} from "lucide-react-native"
import { Share, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { ListRow } from "@/components/ui/list-row"
import { openPassage } from "@/lib/open-passage"
import { siteUrl } from "@/lib/site"
import { flipBookmark, useBookmarks } from "@/repositories/bookmarks"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * The reader's menu, in a native sheet (`?slug=` the passage read): the
 * display settings, the parallel view, the link to share, the bookmarks.
 */
export default function ReaderMenuScreen() {
  const t = useTranslations("Mobile.read.menu")
  const locale = useLocale() as Locale
  const colors = useColors()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const passage = parsePassageSlug(slug)
  const bookmarks = useBookmarks()
  const marked = bookmarks.some((bookmark) => bookmark.slug === slug)
  const name = passage ? formatPassage(passage, locale) : slug
  return (
    <View style={{ backgroundColor: colors.card, paddingTop: spacing.xl }}>
      <Text
        accessibilityRole="header"
        style={[
          typography.h3,
          { color: colors.foreground, textAlign: "center" },
        ]}
      >
        {name}
      </Text>
      <ListRow
        icon={Type}
        label={t("settings")}
        onPress={() => router.replace("/read-settings")}
      />
      {passage ? (
        <ListRow
          icon={Columns2}
          label={t("parallel")}
          onPress={() =>
            router.replace({
              pathname: "/compare",
              params: {
                book: passage.book,
                chapter: String(passage.start.chapter),
                from: "1",
                to: String(getVerseCount(passage.book, passage.start.chapter)),
              },
            })
          }
        />
      ) : null}
      <ListRow
        icon={marked ? BookmarkCheck : Bookmark}
        label={t(marked ? "removeBookmark" : "addBookmark")}
        onPress={() => flipBookmark(slug)}
      />
      <ListRow
        icon={Link}
        label={t("shareLink")}
        onPress={() =>
          void Share.share({
            title: name,
            message: `${name} — ${siteUrl}/read/${slug}`,
          })
        }
        last={bookmarks.length === 0}
      />
      {bookmarks.length > 0 ? (
        <Text
          style={[
            typography.label,
            {
              color: colors.mutedForeground,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.sm,
            },
          ]}
        >
          {t("bookmarks")}
        </Text>
      ) : null}
      {bookmarks.slice(0, 8).map((bookmark, index, shown) => {
        const place = parsePassageSlug(bookmark.slug)
        return (
          <ListRow
            key={bookmark.slug}
            label={place ? formatPassage(place, locale) : bookmark.slug}
            onPress={() => openPassage(bookmark.slug)}
            last={index === shown.length - 1}
          />
        )
      })}
    </View>
  )
}
