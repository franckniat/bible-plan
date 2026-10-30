import { router } from "expo-router"
import { Bell } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Pressable, View } from "react-native"
import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"
import { useUnreadNotifications } from "@/repositories/notifications"
import { useColors } from "@/theme/use-colors"

// A screen opened from a link gets a back button to the tab's root.
export const unstable_settings = { initialRouteName: "today" }

export default function TodayStack() {
  const t = useTranslations("App.nav")
  return (
    <LargeTitleStack
      name="today"
      title={t("today")}
      headerRight={() => <NotificationBell />}
    />
  )
}

/** The notification centre, with a dot while some are unread. */
function NotificationBell() {
  const t = useTranslations("Notifications.bell")
  const colors = useColors()
  // Reminders ring while the app is open too: the count follows the minutes.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const unread = useUnreadNotifications(now)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? t("unread", { count: unread }) : t("label")
      }
      hitSlop={12}
      onPress={() => router.push("/notifications")}
    >
      <Bell size={22} color={colors.foreground} />
      {unread > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}
    </Pressable>
  )
}
