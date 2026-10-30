import { maxPrayerTimeMinutes, prayerMinutes } from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { SessionFlow } from "@/components/session/session-flow"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { rescheduleReminders } from "@/lib/reminders/schedule"
import { prayerTimes } from "@/repositories/reminders"

/**
 * A prayer time, opened by its notification (bibleplan://prayer-time?minutes=
 * its length): the prayer timer, set to that length.
 */
export default function PrayerTimeScreen() {
  const t = useTranslations("PrayerTimer")
  const tTime = useTranslations("Mobile.prayerTime")
  const { minutes, at, reminder } = useLocalSearchParams<{
    minutes?: string
    /** The start of the prayer time, with its reminder: it can be skipped. */
    at?: string
    reminder?: string
  }>()
  const [skipped, setSkipped] = useState(false)
  const [opened] = useState(() => Date.now())
  const startsAt = at ? new Date(at) : null
  const skippable =
    reminder && startsAt && !Number.isNaN(startsAt.getTime())
      ? startsAt.getTime() > opened
      : false
  const length = Number(minutes)
  const valid =
    Number.isInteger(length) && length > 0 && length <= maxPrayerTimeMinutes
  const durations = valid
    ? [...new Set([length, ...prayerMinutes])].sort((a, b) => a - b)
    : prayerMinutes
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        {skipped ? (
          <Card>
            <Body>{tTime("skipped")}</Body>
            <Button
              title={t("done.backToJournal")}
              onPress={() => router.navigate("/prayer")}
            />
          </Card>
        ) : null}
        {skippable && !skipped ? (
          <Button
            title={tTime("skip")}
            variant="ghost"
            onPress={() => {
              prayerTimes.skip(reminder!, startsAt!)
              void rescheduleReminders()
              setSkipped(true)
            }}
          />
        ) : null}
        {skipped ? null : (
          <SessionFlow
            kind="PRAYER"
            minutes={durations}
            defaultMinutes={valid ? length : 30}
            after={() => (
              <Button
                title={t("done.backToJournal")}
                onPress={() => router.navigate("/prayer")}
              />
            )}
          />
        )}
      </TabScreen>
    </>
  )
}
