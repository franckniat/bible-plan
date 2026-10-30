import {
  getToday,
  maxPrayerRequestsPerUser,
  maxPrayerTextLength,
  maxPrayerTitleLength,
  prayerCategories,
  type PrayerCategory,
} from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Text, View } from "react-native"
import { useTranslations } from "use-intl"

import { TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { prayerJournal, usePrayer } from "@/repositories/prayers"
import { useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** Adds a prayer request, or changes one (`?id=`). */
export default function PrayerEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const prayer = usePrayer(id)
  // The form starts from the request once it is read.
  return (
    <PrayerForm key={prayer?.id ?? "new"} id={id ?? null} prayer={prayer} />
  )
}

function PrayerForm({
  id,
  prayer,
}: {
  id: string | null
  prayer: ReturnType<typeof usePrayer>
}) {
  const t = useTranslations("Prayer")
  const colors = useColors()
  const profile = useProfile()
  const [title, setTitle] = useState(prayer?.title ?? "")
  const [details, setDetails] = useState(prayer?.details ?? "")
  const [category, setCategory] = useState<PrayerCategory>(
    prayer?.category ?? "PERSONAL"
  )
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    if (!title.trim()) return setError(t("errors.invalid"))
    const result = prayerJournal.save(
      { title, details, category },
      id,
      getToday(profile.timeZone)
    )
    if (result.ok) return router.back()
    setError(
      result.error === "limit"
        ? t("errors.limit", { max: maxPrayerRequestsPerUser })
        : t("errors.notFound")
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? t("edit") : t("add") }} />
      <TabScreen>
        <Input
          label={t("fields.title")}
          placeholder={t("fields.titlePlaceholder")}
          value={title}
          onChangeText={setTitle}
          maxLength={maxPrayerTitleLength}
          autoFocus={!id}
        />
        <Input
          label={t("fields.details")}
          value={details}
          onChangeText={setDetails}
          maxLength={maxPrayerTextLength}
          multiline
          style={{ minHeight: 96, textAlignVertical: "top", paddingTop: 12 }}
        />
        <View style={{ gap: spacing.sm }}>
          <Text
            style={[
              typography.small,
              {
                color: colors.foreground,
                fontFamily: typography.label.fontFamily,
              },
            ]}
          >
            {t("fields.category")}
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
          >
            {prayerCategories.map((value) => (
              <Chip
                key={value}
                label={t(`categories.${value}`)}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>
        </View>
        {error ? (
          <Text style={[typography.small, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}
        <Button title={t("save")} onPress={save} />
        <Button
          title={t("cancel")}
          variant="ghost"
          onPress={() => router.back()}
        />
      </TabScreen>
    </>
  )
}
