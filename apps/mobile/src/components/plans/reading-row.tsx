import { formatPassage, toPassageSlug, type Locale } from "@workspace/core"
import { router } from "expo-router"
import { Circle, CircleCheck } from "lucide-react-native"
import { Pressable } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { ListRow } from "@/components/ui/list-row"
import { haptics } from "@/lib/haptics"
import { markReading, type PlanReadingView } from "@/repositories/plans"
import { useColors } from "@/theme/use-colors"

/**
 * A reading of a plan's day: it opens the passage in the reader, and its
 * circle marks it as read (offline).
 */
export function ReadingRow({
  reading,
  trackNames,
  last,
}: {
  reading: PlanReadingView
  trackNames: (Record<Locale, string> | null)[]
  last?: boolean
}) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const colors = useColors()
  const track = trackNames.length > 1 ? trackNames[reading.track] : null
  const verses = t("Readings.verses", { verses: reading.verses })
  const passage = formatPassage(reading.passage, locale)
  const done = reading.completedAt !== null
  return (
    <ListRow
      label={passage}
      subtitle={track ? `${track[locale]} · ${verses}` : verses}
      onPress={() =>
        router.push({
          pathname: "/read/[passage]",
          params: {
            passage: toPassageSlug(reading.passage),
            reading: reading.id,
          },
        })
      }
      trailing={
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={passage}
          hitSlop={12}
          onPress={() => {
            haptics.tap()
            markReading(reading.id, !done)
          }}
        >
          {done ? (
            <CircleCheck size={26} color={colors.accent} />
          ) : (
            <Circle size={26} color={colors.mutedForeground} />
          )}
        </Pressable>
      }
      last={last}
    />
  )
}
