import { getToday, maxPrayerTextLength } from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { prayerJournal, usePrayer } from "@/repositories/prayers"
import { useProfile } from "@/repositories/profile"

/** Marks a request answered (`?id=`), or changes what was noted. */
export default function PrayerAnswerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const prayer = usePrayer(id)
  return <AnswerForm key={prayer?.id ?? "none"} id={id} prayer={prayer} />
}

function AnswerForm({
  id,
  prayer,
}: {
  id: string
  prayer: ReturnType<typeof usePrayer>
}) {
  const t = useTranslations("Prayer")
  const profile = useProfile()
  const [note, setNote] = useState(prayer?.answerNote ?? "")
  if (!prayer) {
    return (
      <TabScreen>
        <Body>{t("errors.notFound")}</Body>
      </TabScreen>
    )
  }
  return (
    <>
      <Stack.Screen
        options={{
          title:
            prayer.status === "ANSWERED"
              ? t("editAnswer")
              : t("confirmAnswered"),
        }}
      />
      <TabScreen>
        <Body>{prayer.title}</Body>
        <Input
          label={t("fields.answerNote")}
          placeholder={t("fields.answerPlaceholder")}
          value={note}
          onChangeText={setNote}
          maxLength={maxPrayerTextLength}
          multiline
          autoFocus
          style={{ minHeight: 120, textAlignVertical: "top", paddingTop: 12 }}
        />
        <Button
          title={
            prayer.status === "ANSWERED" ? t("save") : t("confirmAnswered")
          }
          onPress={() => {
            const result = prayerJournal.answered(
              id,
              { answerNote: note },
              getToday(profile.timeZone)
            )
            if (result.ok) router.back()
          }}
        />
        <Button
          title={t("cancel")}
          variant="ghost"
          onPress={() => router.back()}
        />
      </TabScreen>
    </>
  )
}
