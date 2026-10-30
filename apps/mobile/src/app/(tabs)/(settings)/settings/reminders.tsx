import { allWeekdays, type Weekday } from "@workspace/core"
import { router, Stack } from "expo-router"
import { BellRing, Plus } from "lucide-react-native"
import { View } from "react-native"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { useWeekdayNames } from "@/lib/weekdays"
import { useReminders, type Reminder } from "@/repositories/reminders"
import { useProfile } from "@/repositories/profile"

/** The reminders of the phone, as local notifications. */
export default function RemindersScreen() {
  const t = useTranslations("Reminders")
  const profile = useProfile()
  const list = useReminders()
  const weekday = useWeekdayNames()
  const days = (reminder: Reminder) =>
    reminder.weekdays.length === allWeekdays.length
      ? t("everyDay")
      : [1, 2, 3, 4, 5, 6, 0]
          .filter((day) => reminder.weekdays.includes(day as Weekday))
          .map((day) => weekday(day as Weekday))
          .join(", ")
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <Button
          title={t("add")}
          icon={Plus}
          onPress={() => router.push("/settings/reminder-edit")}
        />
        {list.length === 0 ? (
          <Card title={t("empty.title")}>
            <Body>{t("empty.description")}</Body>
          </Card>
        ) : (
          <Card padded={false}>
            <View>
              {list.map((reminder, index) => (
                <ListRow
                  key={reminder.id}
                  icon={BellRing}
                  label={`${t(`kinds.${reminder.kind}`)} · ${reminder.localTime}`}
                  subtitle={days(reminder)}
                  value={reminder.enabled ? undefined : "—"}
                  onPress={() =>
                    router.push({
                      pathname: "/settings/reminder-edit",
                      params: { id: reminder.id },
                    })
                  }
                  last={index === list.length - 1}
                />
              ))}
            </View>
          </Card>
        )}
        <Body>
          {t("timeZoneNote", {
            timeZone: profile.timeZone.replaceAll("_", " "),
          })}
        </Body>
      </TabScreen>
    </>
  )
}
