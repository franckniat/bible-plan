import {
  allWeekdays,
  maxRemindersPerUser,
  reminderKinds,
  type ReminderKind,
  type Weekday,
} from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Text, View } from "react-native"
import { useTranslations } from "use-intl"

import { TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { SwitchRow } from "@/components/ui/switch-row"
import { TimeStepper } from "@/components/ui/time-stepper"
import { confirm } from "@/lib/confirm"
import {
  allowNotifications,
  rescheduleReminders,
} from "@/lib/reminders/schedule"
import { useWeekdayNames, weekdaysFromMonday } from "@/lib/weekdays"
import {
  reminderBook,
  useReminder,
  type Reminder,
} from "@/repositories/reminders"
import { useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** Adds a reminder, or changes one (`?id=`). */
export default function ReminderEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const reminder = useReminder(id)
  return (
    <ReminderForm
      key={reminder?.id ?? "new"}
      id={id ?? null}
      reminder={reminder}
    />
  )
}

function ReminderForm({
  id,
  reminder,
}: {
  id: string | null
  reminder: Reminder | null
}) {
  const t = useTranslations("Reminders")
  const colors = useColors()
  const profile = useProfile()
  const weekdayName = useWeekdayNames()
  const [kind, setKind] = useState<ReminderKind>(reminder?.kind ?? "READING")
  const [time, setTime] = useState(reminder?.localTime ?? "07:00")
  const [weekdays, setWeekdays] = useState<Weekday[]>(
    reminder?.weekdays ?? [...allWeekdays]
  )
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const label = [
    typography.small,
    { color: colors.foreground, fontFamily: typography.label.fontFamily },
  ]

  const save = async () => {
    if (weekdays.length === 0) return setError(t("errors.noDays"))
    const result = reminderBook.save(
      {
        kind,
        localTime: time,
        timeZone: profile.timeZone,
        weekdays,
        channels: ["IN_APP", "PUSH"],
        enabled,
        leadMinutes: reminder?.leadMinutes ?? 0,
        durationMinutes: reminder?.durationMinutes ?? null,
        focusMode: reminder?.focusMode ?? "NOTIFY",
      },
      id
    )
    if (!result.ok) {
      return setError(
        result.error === "limit"
          ? t("errors.limit", { max: maxRemindersPerUser })
          : t("errors.not_found")
      )
    }
    if (enabled) await allowNotifications()
    void rescheduleReminders()
    router.back()
  }

  const remove = async () => {
    if (!id) return
    const sure = await confirm({
      title: t("confirmDelete"),
      message: t("delete"),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
    })
    if (!sure) return
    reminderBook.remove(id)
    void rescheduleReminders()
    router.back()
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? t("edit") : t("add") }} />
      <TabScreen>
        <Card>
          <Text style={label}>{t("fields.kind")}</Text>
          <View style={styles.chips}>
            {reminderKinds.map((value) => (
              <Chip
                key={value}
                label={t(`kinds.${value}`)}
                selected={kind === value}
                onPress={() => setKind(value)}
              />
            ))}
          </View>
          <Text style={label}>{t("fields.time")}</Text>
          <TimeStepper
            value={time}
            onChange={setTime}
            label={t("fields.time")}
          />
          <Text style={label}>{t("fields.days")}</Text>
          <View style={styles.chips}>
            {weekdaysFromMonday.map((weekday) => (
              <Chip
                key={weekday}
                label={weekdayName(weekday)}
                selected={weekdays.includes(weekday)}
                onPress={() =>
                  setWeekdays((current) =>
                    current.includes(weekday)
                      ? current.filter((day) => day !== weekday)
                      : [...current, weekday].sort()
                  )
                }
              />
            ))}
          </View>
        </Card>
        <Card padded={false}>
          <SwitchRow
            label={t("channels.PUSH")}
            value={enabled}
            onValueChange={setEnabled}
          />
        </Card>
        {error ? (
          <Text style={[typography.small, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}
        <Button title={t("save")} onPress={save} />
        {id ? (
          <Button title={t("delete")} variant="destructive" onPress={remove} />
        ) : (
          <Button
            title={t("cancel")}
            variant="ghost"
            onPress={() => router.back()}
          />
        )}
      </TabScreen>
    </>
  )
}

const styles = {
  chips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.sm,
  },
}
