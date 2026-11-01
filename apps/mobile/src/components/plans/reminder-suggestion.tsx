import { allWeekdays } from "@workspace/core"
import { BellRing } from "lucide-react-native"
import { useState } from "react"
import { useTranslations } from "use-intl"

import { Body } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TimeStepper } from "@/components/ui/time-stepper"
import {
  allowNotifications,
  rescheduleReminders,
} from "@/lib/reminders/schedule"
import { reminderBook, useReminders } from "@/repositories/reminders"
import { useProfile } from "@/repositories/profile"

/**
 * After a plan is made, as on the web: a reading reminder at the time chosen,
 * unless there is already one. "Later" puts it away.
 */
export function ReminderSuggestion() {
  const t = useTranslations("Reminders.suggest")
  const profile = useProfile()
  const reminders = useReminders()
  const [time, setTime] = useState("07:00")
  const [state, setState] = useState<"open" | "saved" | "closed">("open")
  if (state === "closed") return null
  if (state === "saved") {
    return (
      <Card>
        <Body>{t("saved", { time })}</Body>
      </Card>
    )
  }
  if (reminders.some((reminder) => reminder.kind === "READING")) return null
  return (
    <Card title={t("title")}>
      <Body>{t("description")}</Body>
      <TimeStepper value={time} onChange={setTime} label={t("time")} />
      <Button
        title={t("create")}
        icon={BellRing}
        onPress={async () => {
          const saved = reminderBook.save(
            {
              kind: "READING",
              localTime: time,
              timeZone: profile.timeZone,
              weekdays: [...allWeekdays],
              channels: ["IN_APP", "PUSH"],
            },
            null
          )
          if (!saved.ok) return setState("closed")
          await allowNotifications()
          void rescheduleReminders()
          setState("saved")
        }}
      />
      <Button
        title={t("later")}
        variant="ghost"
        onPress={() => setState("closed")}
      />
    </Card>
  )
}
