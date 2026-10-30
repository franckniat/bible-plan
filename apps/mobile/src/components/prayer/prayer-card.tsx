import { router } from "expo-router"
import {
  Archive,
  Check,
  HandHeart,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react-native"
import { Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { confirm } from "@/lib/confirm"
import { haptics } from "@/lib/haptics"
import { prayerJournal, type Prayer } from "@/repositories/prayers"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

const day = (date: string) => new Date(`${date}T00:00:00.000Z`)

/** A request of the journal with what can be done with it, as on the web. */
export function PrayerCard({ prayer }: { prayer: Prayer }) {
  const t = useTranslations("Prayer")
  const format = useFormatter()
  const colors = useColors()
  const date = (value: string) =>
    format.dateTime(day(value), { dateStyle: "long", timeZone: "UTC" })
  const muted = [typography.small, { color: colors.mutedForeground }]

  const remove = async () => {
    const sure = await confirm({
      title: t("deleteDialog.title"),
      message: t("deleteDialog.description", { title: prayer.title }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
    })
    if (sure) prayerJournal.remove(prayer.id)
  }
  const edit = () =>
    router.push({ pathname: "/prayer-edit", params: { id: prayer.id } })

  return (
    <Card
      title={prayer.title}
      action={<Badge label={t(`categories.${prayer.category}`)} />}
    >
      {prayer.details ? (
        <Text style={[typography.body, { color: colors.foreground }]}>
          {prayer.details}
        </Text>
      ) : null}

      {prayer.status === "ANSWERED" ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.small, { color: colors.foreground }]}>
            {t("answeredOn", {
              date: date(prayer.answeredOn ?? prayer.startedOn),
            })}
          </Text>
          <Text style={muted}>{prayer.answerNote ?? t("noCircumstances")}</Text>
        </View>
      ) : (
        <Text style={muted}>
          {prayer.lastPrayedAt
            ? t("lastPrayed", {
                date: format.dateTime(new Date(prayer.lastPrayedAt), {
                  dateStyle: "long",
                }),
                count: prayer.prayerCount,
              })
            : t("neverPrayed")}
        </Text>
      )}
      <Text style={muted}>
        {t("startedOn", { date: date(prayer.startedOn) })}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {prayer.status === "ACTIVE" ? (
          <>
            <Button
              title={t("prayed")}
              icon={HandHeart}
              size="sm"
              onPress={() => {
                haptics.success()
                prayerJournal.prayed(prayer.id)
              }}
            />
            <Button
              title={t("answered")}
              icon={Check}
              size="sm"
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: "/prayer-answer",
                  params: { id: prayer.id },
                })
              }
            />
            <Button
              title={t("edit")}
              icon={Pencil}
              size="sm"
              variant="ghost"
              onPress={edit}
            />
            <Button
              title={t("archive")}
              icon={Archive}
              size="sm"
              variant="ghost"
              onPress={() => prayerJournal.setStatus(prayer.id, "ARCHIVED")}
            />
          </>
        ) : (
          <>
            {prayer.status === "ANSWERED" ? (
              <Button
                title={t("editAnswer")}
                icon={Pencil}
                size="sm"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: "/prayer-answer",
                    params: { id: prayer.id },
                  })
                }
              />
            ) : null}
            <Button
              title={t("restore")}
              icon={RotateCcw}
              size="sm"
              variant="ghost"
              onPress={() => prayerJournal.setStatus(prayer.id, "ACTIVE")}
            />
            <Button
              title={t("delete")}
              icon={Trash2}
              size="sm"
              variant="destructive"
              onPress={remove}
            />
          </>
        )}
      </View>
    </Card>
  )
}
