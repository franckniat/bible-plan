import { router, Stack, type Href } from "expo-router"
import { BellRing } from "lucide-react-native"
import { useState } from "react"
import { View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import {
  keptDays,
  notificationCentre,
  useRungNotifications,
} from "@/repositories/notifications"
import { useColors } from "@/theme/use-colors"

/** The reminders that rang on this phone, kept 30 days, as on the web. */
export default function NotificationsScreen() {
  const t = useTranslations("Notifications")
  const format = useFormatter()
  const colors = useColors()
  const [now] = useState(() => Date.now())
  const items = useRungNotifications(now)
  const unread = items.some((item) => !item.readAt)
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description", { days: keptDays })}</Body>
        {unread ? (
          <Button
            title={t("markAllRead")}
            variant="outline"
            onPress={() => notificationCentre.markRead()}
          />
        ) : null}
        {items.length === 0 ? (
          <Card title={t("empty.title")}>
            <Body>{t("empty.description")}</Body>
          </Card>
        ) : (
          <Card padded={false}>
            <View>
              {items.map((item, index) => (
                <ListRow
                  key={item.id}
                  icon={BellRing}
                  label={item.title}
                  subtitle={`${item.body} · ${format.relativeTime(new Date(item.at), now)}`}
                  trailing={
                    item.readAt ? undefined : (
                      <View
                        accessible
                        accessibilityLabel={t("unreadItem")}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: colors.accent,
                        }}
                      />
                    )
                  }
                  onPress={() => {
                    notificationCentre.markRead([item.id])
                    router.push(item.href as Href)
                  }}
                  last={index === items.length - 1}
                />
              ))}
            </View>
          </Card>
        )}
      </TabScreen>
    </>
  )
}
