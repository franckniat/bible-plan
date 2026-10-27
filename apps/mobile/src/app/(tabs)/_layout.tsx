import { Tabs } from "expo-router/js-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslations } from "use-intl"

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
        // Each tab is a stack with its own native large title.
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 58 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        // Small labels, as in the tab bars of iOS and Android.
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 10 },
      }}
    >
      {tabs.map(({ name, label, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(label),
            tabBarIcon: ({ focused, color }) => (
              <Icon size={22} color={focused ? colors.accent : color} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
