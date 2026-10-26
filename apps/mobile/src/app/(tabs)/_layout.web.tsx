import { Tabs } from "expo-router/js-tabs"

import { useTranslations } from "use-intl"

import { tabs } from "@/components/tabs"
import { useColors } from "@/theme/use-colors"

/**
 * On the web the native tabs sit at the top of the page; this bottom bar
 * keeps the browser preview close to the phone.
 */
export default function TabsLayout() {
  const colors = useColors()
  const t = useTranslations()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIconStyle: { display: "none" },
        tabBarLabelStyle: { fontSize: 13 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: t(tab.label) }}
        />
      ))}
    </Tabs>
  )
}
