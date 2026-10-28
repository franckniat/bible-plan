import { formatPassage, toPassageSlug, type Locale } from "@workspace/core"
import { router } from "expo-router"
import { useLocale, useTranslations } from "use-intl"

import { ListRow } from "@/components/ui/list-row"
import type { PlanReadingView } from "@/repositories/plans"

/** A reading of a plan's day; it opens the passage in the reader. */
export function ReadingRow({
  reading,
  trackNames,
  last,
}: {
  reading: PlanReadingView
  trackNames: (Record<Locale, string> | null)[]
  last?: boolean
}) {
  const t = useTranslations("Readings")
  const locale = useLocale() as Locale
  const track = trackNames.length > 1 ? trackNames[reading.track] : null
  const verses = t("verses", { verses: reading.verses })
  return (
    <ListRow
      label={formatPassage(reading.passage, locale)}
      subtitle={track ? `${track[locale]} · ${verses}` : verses}
      onPress={() => router.push(`/read/${toPassageSlug(reading.passage)}`)}
      last={last}
    />
  )
}
