import type { CatchUpStrategy, IsoDate } from "@workspace/core"
import { Hourglass } from "lucide-react-native"
import { useState } from "react"
import { Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { catchUp, useCatchUpPreview } from "@/repositories/plans"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * Late readings in a plan, and the two ways to catch up offline, as on the
 * web: shift the plan, or spread the readings left until its end.
 */
export function CatchUpNotice({
  planId,
  late,
  today,
}: {
  planId: string
  /** Unread readings planned before today. */
  late: number
  today: IsoDate
}) {
  const t = useTranslations("CatchUp")
  const format = useFormatter()
  const colors = useColors()
  const shift = useCatchUpPreview(planId, "SHIFT", today)
  const spread = useCatchUpPreview(planId, "REDISTRIBUTE", today)
  const [error, setError] = useState<string | null>(null)
  if (late === 0) return null

  const date = (value: IsoDate) =>
    format.dateTime(new Date(`${value}T00:00:00.000Z`), {
      dateStyle: "long",
      timeZone: "UTC",
    })
  const hint = (strategy: CatchUpStrategy) => {
    const preview = strategy === "SHIFT" ? shift : spread
    if (!preview.ok) return t(`errors.${preview.error}`)
    const changes = preview.changes
    if (!changes) return null
    if (strategy === "SHIFT") {
      return t("shiftHint", { date: date(changes.endDate) })
    }
    const verses = changes.addDays.flatMap((day) =>
      day.readings.map((reading) => reading.verses)
    )
    return t("redistributeHint", {
      date: date(changes.endDate),
      verses: Math.round(
        verses.reduce((total, count) => total + count, 0) /
          Math.max(1, changes.addDays.length)
      ),
    })
  }
  const apply = (strategy: CatchUpStrategy) => {
    const result = catchUp(planId, strategy, today)
    setError(result.ok ? null : t(`errors.${result.error}`))
  }

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <Notice
        icon={Hourglass}
        actions={
          <View style={{ gap: spacing.sm }}>
            {(["SHIFT", "REDISTRIBUTE"] as const).map((strategy) => {
              const preview = strategy === "SHIFT" ? shift : spread
              return (
                <View key={strategy} style={{ gap: spacing.xs }}>
                  <Button
                    title={t(strategy)}
                    size="sm"
                    variant={strategy === "SHIFT" ? "primary" : "outline"}
                    disabled={!preview.ok || !preview.changes}
                    onPress={() => apply(strategy)}
                  />
                  <Text
                    style={[
                      typography.small,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {hint(strategy)}
                  </Text>
                </View>
              )
            })}
            {error ? (
              <Text style={[typography.small, { color: colors.destructive }]}>
                {error}
              </Text>
            ) : null}
          </View>
        }
      >
        {t("late", { count: late })}
      </Notice>
    </View>
  )
}
