import { Tabs } from "expo-router/js-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslations } from "use-intl"

import { AppHeader } from "@/components/app-header"
import { tabs } from "@/components/tabs"
import { fontFamily } from "@/theme/fonts"
import { useColors } from "@/theme/use-colors"

/** Bottom tab bar like the web's on phones: the active icon turns gold. */
export default function TabsLayout() {
  const colors = useColors()
  const t = useTranslations("App.nav")
  const bottom = Math.max(useSafeAreaInsets().bottom, 8)
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 58 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12 },
      }}
    >
      {tabs.map(({ name, label, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(label),
            tabBarIcon: ({ focused, color, size }) => (
              <Icon size={size} color={focused ? colors.accent : color} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
