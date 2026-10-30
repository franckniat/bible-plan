import {
  allWeekdays,
  maxRemindersPerUser,
  prayerMinutes,
  prayerTimeLeadMinutes,
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
  // A prayer reminder can be a prayer time: a length, a warning before.
  const [duration, setDuration] = useState<number | null>(
    reminder?.durationMinutes ?? null
  )
  const [lead, setLead] = useState(
    reminder?.durationMinutes ? reminder.leadMinutes : prayerTimeLeadMinutes
  )
  const prayerTime = kind === "PRAYER" && duration !== null
  const [error, setError] = useState<string | null>(null)
  const muted = [typography.small, { color: colors.mutedForeground }]
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
        leadMinutes: prayerTime ? lead : 0,
        durationMinutes: prayerTime ? duration : null,
        // The prayer screen and focus modes come with M15.
        focusMode: "NOTIFY",
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
        {kind === "PRAYER" ? (
          <Card padded={false}>
            <SwitchRow
              label={t("prayerTime.label")}
              value={duration !== null}
              onValueChange={(on) => setDuration(on ? 30 : null)}
            />
            {duration !== null ? (
              <View style={styles.section}>
                <Text style={muted}>{t("prayerTime.description")}</Text>
                <Text style={label}>{t("prayerTime.duration")}</Text>
                <View style={styles.chips}>
                  {prayerMinutes.map((minutes) => (
                    <Chip
                      key={minutes}
                      label={t("prayerTime.minutes", { minutes })}
                      selected={duration === minutes}
                      onPress={() => setDuration(minutes)}
                    />
                  ))}
                </View>
                <Text style={label}>{t("prayerTime.lead")}</Text>
                <View style={styles.chips}>
                  {leadChoices.map((minutes) => (
                    <Chip
                      key={minutes}
                      label={
                        minutes === 0
                          ? t("prayerTime.leadNone")
                          : t("prayerTime.leadMinutes", { minutes })
                      }
                      selected={lead === minutes}
                      onPress={() => setLead(minutes)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        ) : null}
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

/** How long before a prayer time it is announced. */
const leadChoices = [0, 5, 10, 15]

const styles = {
  section: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  chips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.sm,
  },
}
