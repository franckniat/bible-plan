import { NativeTabs } from "expo-router/native-tabs"

import { tabs } from "@/components/tabs"
import { useColors } from "@/theme/use-colors"

/** Native bottom tabs on Android and iOS. */
export default function TabsLayout() {
  const colors = useColors()
  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.primary}
      indicatorColor={colors.muted}
      labelStyle={{ selected: { color: colors.foreground } }}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  )
}
